import hmac
import logging
from datetime import timedelta
from unittest import mock

from django.test import Client, TestCase, override_settings, tag
from django.utils import timezone

from gateway import public_api
from gateway.tests import StubApiServiceMixin
from users import tokens
from users.models import PersonalToken, TokenRequest, User
from users.throttling import MAX_ATTEMPTS

READ = [PersonalToken.Scope.FINANCE_READ]
WRITE = [PersonalToken.Scope.MOVEMENTS_CREATE]


@tag("database")
@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class PublicApiTestCase(StubApiServiceMixin, TestCase):
    def setUp(self):
        super().setUp()
        # Scripts have no browser: CSRF checks stay on to show they do not apply.
        self.client = Client(enforce_csrf_checks=True)
        self.ana = User.objects.create_user("ana@example.com", "correct-horse-battery")
        self.bruno = User.objects.create_user("bruno@example.com", "correct-horse-battery")

    def token(self, scopes=READ + WRITE, user=None):
        token, secret = tokens.issue(user or self.ana, "Script", scopes)
        return token, secret

    def get(self, path, secret, headers=None):
        return self.client.get(path, headers={"Authorization": f"Bearer {secret}", **(headers or {})})

    def post(self, path, secret, body="{}", key="key-1"):
        headers = {"Authorization": f"Bearer {secret}"}
        if key is not None:
            headers["Idempotency-Key"] = key
        return self.client.post(path, data=body, content_type="application/json", headers=headers)


class AuthenticationTests(PublicApiTestCase):
    def test_a_missing_invalid_or_revoked_token_is_401_and_never_reaches_api_service(self):
        revoked, revoked_secret = self.token()
        tokens.revoke(revoked)
        _, live = self.token()
        cases = {
            "none": {},
            "wrong scheme": {"Authorization": f"Basic {live}"},
            "garbage": {"Authorization": "Bearer nonsense"},
            "unknown prefix": {"Authorization": "Bearer okt_00000000_secret"},
            "wrong secret": {"Authorization": "Bearer " + live[:-3] + "xyz"},
            "revoked": {"Authorization": f"Bearer {revoked_secret}"},
        }
        for name, headers in cases.items():
            with self.subTest(case=name):
                response = self.client.get("/api/v1/accounts", headers=headers)

                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.headers["WWW-Authenticate"], "Bearer")
        self.assertEqual(self.api_service.received, [])

    def test_a_session_cookie_does_not_replace_the_token(self):
        self.client.force_login(self.ana)

        response = self.client.get("/api/v1/accounts")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.api_service.received, [])

    def test_a_token_is_not_a_session_on_the_application_routes(self):
        _, secret = self.token()
        headers = {"Authorization": f"Bearer {secret}"}
        # Without CSRF enforcement, so the answer shown is the one of authentication.
        client = Client()

        for method, path in (
            ("get", "/api/accounts"),
            ("post", "/api/expenses"),
            ("get", "/api/settings/tokens"),
            ("post", "/api/settings/tokens"),
            ("delete", "/api/settings/tokens/1"),
        ):
            with self.subTest(path=path, method=method):
                response = getattr(client, method)(path, headers=headers)

                self.assertEqual(response.status_code, 401)
        self.assertEqual(self.api_service.received, [])

    def test_revoking_cuts_the_very_next_request(self):
        token, secret = self.token()
        self.assertEqual(self.get("/api/v1/accounts", secret).status_code, 200)

        tokens.revoke(token)

        self.assertEqual(self.get("/api/v1/accounts", secret).status_code, 401)

    def test_the_secret_is_compared_in_constant_time_even_for_an_unknown_token(self):
        _, secret = self.token()
        with mock.patch("users.tokens.hmac.compare_digest", wraps=hmac.compare_digest) as compare:
            self.get("/api/v1/accounts", secret)
            self.get("/api/v1/accounts", "okt_00000000_unknown")

        self.assertEqual(compare.call_count, 2)

    def test_no_log_line_carries_the_token(self):
        _, secret = self.token()
        lines = []

        class Collect(logging.Handler):
            def emit(self, record):
                lines.append(record.getMessage())

        handler = Collect(level=logging.DEBUG)
        root = logging.getLogger()
        previous = root.level
        root.addHandler(handler)
        root.setLevel(logging.DEBUG)
        try:
            self.get("/api/v1/accounts", secret)
            self.get("/api/v1/accounts", secret + "x")
            self.post("/api/v1/movements", secret)
        finally:
            root.removeHandler(handler)
            root.setLevel(previous)

        self.assertFalse([line for line in lines if secret in line])


class PermissionAndRoutingTests(PublicApiTestCase):
    def test_a_token_without_the_permission_gets_403(self):
        _, read_only = self.token(READ)
        _, write_only = self.token(WRITE)

        self.assertEqual(self.post("/api/v1/movements", read_only).status_code, 403)
        for path in ("/api/v1/accounts", "/api/v1/budgets", "/api/v1/movements"):
            with self.subTest(path=path):
                self.assertEqual(self.get(path, write_only).status_code, 403)
        self.assertEqual(self.api_service.received, [])

    def test_only_the_calls_of_the_contract_exist(self):
        _, secret = self.token()

        self.assertEqual(self.get("/api/v1/expenses", secret).status_code, 404)
        self.assertEqual(self.get("/api/v1/accounts/", secret).status_code, 404)
        self.assertEqual(self.post("/api/v1/accounts", secret).status_code, 405)
        self.assertEqual(self.client.delete("/api/v1/movements/1", headers={"Authorization": f"Bearer {secret}"}).status_code, 404)
        self.assertEqual(self.api_service.received, [])


class ForwardingTests(PublicApiTestCase):
    def test_a_read_reaches_api_service_as_the_user_of_the_token(self):
        _, secret = self.token(user=self.bruno)

        response = self.get(
            "/api/v1/movements?page_size=5&type=expense",
            secret,
            headers={"X-Okane-User-Id": str(self.ana.pk), "X-Okane-Service-Key": "forged"},
        )

        self.assertEqual(response.status_code, 200)
        forwarded = self.api_service.received[0]
        self.assertEqual(forwarded.path, "/api/v1/movements?page_size=5&type=expense")
        self.assertEqual(forwarded.headers["x-okane-user-id"], str(self.bruno.pk))
        self.assertEqual(forwarded.headers["x-okane-service-key"], "expected-key")
        self.assertNotIn("authorization", forwarded.headers)

    def test_a_write_carries_its_idempotency_key_and_body_without_csrf(self):
        _, secret = self.token()
        self.api_service.status = 201
        self.api_service.body = b'{"type": "expense", "id": 3}'

        response = self.post("/api/v1/movements", secret, body='{"type": "expense"}', key="abc-123")

        self.assertEqual(response.status_code, 201)
        forwarded = self.api_service.received[0]
        self.assertEqual(forwarded.method, "POST")
        self.assertEqual(forwarded.headers["idempotency-key"], "abc-123")
        self.assertEqual(forwarded.body, b'{"type": "expense"}')
        self.assertNotIn("cookie", forwarded.headers)

    def test_the_answer_of_api_service_comes_back_unchanged(self):
        _, secret = self.token()
        self.api_service.status = 409
        self.api_service.body = b'{"errors": {"idempotency_key": ["x"]}}'

        response = self.post("/api/v1/movements", secret)

        self.assertEqual((response.status_code, response.json()), (409, {"errors": {"idempotency_key": ["x"]}}))

    def test_a_session_write_still_needs_its_csrf_token(self):
        self.client.force_login(self.ana)

        response = self.client.post("/api/expenses", data="{}", content_type="application/json")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.api_service.received, [])


class RateLimitTests(PublicApiTestCase):
    def test_the_121st_request_of_a_minute_is_429_and_is_not_forwarded(self):
        token, secret = self.token()
        now = timezone.now()
        TokenRequest.objects.bulk_create(
            TokenRequest(token=token, requested_at=now - timedelta(seconds=30)) for _ in range(120)
        )

        response = self.post("/api/v1/movements", secret)

        self.assertEqual(response.status_code, 429)
        self.assertGreaterEqual(int(response.headers["Retry-After"]), 1)
        self.assertLessEqual(int(response.headers["Retry-After"]), 30)
        self.assertEqual(self.api_service.received, [])

    def test_requests_older_than_a_minute_do_not_count_and_each_token_has_its_own_limit(self):
        token, secret = self.token()
        _, other = self.token()
        TokenRequest.objects.bulk_create(
            TokenRequest(token=token, requested_at=timezone.now() - timedelta(seconds=61)) for _ in range(120)
        )

        self.assertEqual(self.get("/api/v1/accounts", secret).status_code, 200)
        self.assertEqual(self.get("/api/v1/accounts", other).status_code, 200)

    def test_repeated_invalid_tokens_from_one_origin_are_limited_like_logins(self):
        _, secret = self.token()
        for _ in range(MAX_ATTEMPTS):
            self.assertEqual(self.get("/api/v1/accounts", "okt_00000000_wrong").status_code, 401)

        blocked = self.get("/api/v1/accounts", secret)

        self.assertEqual(blocked.status_code, 429)
        self.assertGreater(int(blocked.headers["Retry-After"]), 0)
        self.assertEqual(self.api_service.received, [])

    def test_a_missing_token_is_not_counted_as_an_invalid_one(self):
        _, secret = self.token()
        for _ in range(MAX_ATTEMPTS + 1):
            self.client.get("/api/v1/accounts")

        self.assertEqual(self.get("/api/v1/accounts", secret).status_code, 200)


class OpenApiTests(PublicApiTestCase):
    def test_the_contract_is_published_without_a_token_and_describes_the_six_types(self):
        response = Client().get("/api/v1/openapi.json")

        self.assertEqual(response.status_code, 200)
        document = response.json()
        self.assertEqual(set(document["paths"]), set(public_api.ROUTES))
        schemas = document["components"]["schemas"]
        self.assertEqual(
            {name for name in schemas if name.startswith("New")},
            {"NewIncome", "NewExpense", "NewTransfer", "NewBuy", "NewSell", "NewDividend"},
        )
        movements = document["paths"]["/api/v1/movements"]
        self.assertTrue({"200", "400", "401", "403", "404", "409", "429"} <= set(movements["post"]["responses"]) | set(movements["get"]["responses"]))
        self.assertEqual(len(movements["post"]["requestBody"]["content"]["application/json"]["examples"]), 6)
        for operation in (movements["get"], document["paths"]["/api/v1/accounts"]["get"]):
            self.assertIn("429", operation["responses"])
            page_size = next(p for p in operation["parameters"] if p["name"] == "page_size")
            self.assertEqual((page_size["schema"]["default"], page_size["schema"]["maximum"]), (50, 200))
