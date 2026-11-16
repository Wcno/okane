from django.test import Client, SimpleTestCase, TestCase, override_settings, tag

from gateway.stub_api_service import StubApiService
from users.models import User


class StubApiServiceMixin:
    def setUp(self):
        super().setUp()
        self.api_service = StubApiService().start()
        self.addCleanup(self.api_service.stop)
        settings = override_settings(
            API_SERVICE_URL=self.api_service.url,
            INTERNAL_SERVICE_KEY="expected-key",
        )
        settings.enable()
        self.addCleanup(settings.disable)


class PublicHealthTests(StubApiServiceMixin, SimpleTestCase):
    def test_health_returns_the_answer_of_api_service_without_a_session(self):
        self.api_service.body = (
            b'{"status": "ok", "service": "api-service", "database": "ok"}'
        )

        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "api-service", "database": "ok"},
        )
        forwarded = self.api_service.received[0]
        self.assertEqual(forwarded.path, "/api/health")
        self.assertNotIn("x-okane-user-id", forwarded.headers)

    def test_names_api_service_when_it_cannot_be_reached(self):
        self.api_service.stop()

        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json(), {"status": "unavailable", "service": "api-service"}
        )

    def test_a_path_cannot_climb_out_of_the_api_prefix(self):
        for path in ("/api/../internal/users", "/api/accounts/../../internal"):
            with self.subTest(path=path):
                response = self.client.get(path)

                self.assertEqual(response.status_code, 404)
        self.assertEqual(self.api_service.received, [])


@tag("database")
@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class SessionGatewayTestCase(StubApiServiceMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.ana = User.objects.create_user("ana@example.com", "correct-horse-battery")
        self.bruno = User.objects.create_user("bruno@example.com", "correct-horse-battery")
        self.client.force_login(self.ana)


class SessionRequiredTests(SessionGatewayTestCase):
    def test_a_financial_call_without_a_session_gets_401_and_never_reaches_api_service(self):
        anonymous = Client()
        for method in ("get", "post", "put", "delete"):
            with self.subTest(method=method):
                response = getattr(anonymous, method)("/api/accounts")

                self.assertEqual(response.status_code, 401)
                self.assertEqual(response.json(), {"detail": "authentication_required"})
        self.assertEqual(self.api_service.received, [])

    def test_a_forged_identity_without_a_session_is_not_forwarded(self):
        response = Client().get(
            "/api/accounts",
            headers={
                "X-Okane-User-Id": str(self.ana.pk),
                "X-Okane-Service-Key": "expected-key",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.api_service.received, [])

    def test_a_call_after_logout_gets_401(self):
        cookie = self.client.cookies["sessionid"].value
        self.client.logout()
        old_session = Client()
        old_session.cookies["sessionid"] = cookie

        response = old_session.get("/api/accounts")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.api_service.received, [])

    def test_the_public_api_does_not_accept_a_session_cookie(self):
        response = self.client.get("/api/v1/accounts")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.api_service.received, [])


class IdentityForwardingTests(SessionGatewayTestCase):
    def test_every_forwarded_call_carries_the_user_of_the_session(self):
        self.client.get("/api/accounts")
        self.client.post("/api/expenses", data="{}", content_type="application/json")

        for forwarded in self.api_service.received:
            self.assertEqual(forwarded.headers["x-okane-user-id"], str(self.ana.pk))
            self.assertEqual(forwarded.headers["x-okane-service-key"], "expected-key")

    def test_two_users_reach_api_service_as_themselves(self):
        bruno = Client()
        bruno.force_login(self.bruno)

        self.client.get("/api/accounts")
        bruno.get("/api/accounts")

        identities = [r.headers["x-okane-user-id"] for r in self.api_service.received]
        self.assertEqual(identities, [str(self.ana.pk), str(self.bruno.pk)])

    def test_an_identity_sent_by_the_browser_is_replaced_by_the_session(self):
        self.client.get(
            "/api/accounts",
            headers={
                "X-Okane-User-Id": str(self.bruno.pk),
                "X-Okane-Service-Key": "forged-key",
            },
        )

        forwarded = self.api_service.received[0].headers
        self.assertEqual(forwarded["x-okane-user-id"], str(self.ana.pk))
        self.assertEqual(forwarded["x-okane-service-key"], "expected-key")

    def test_builds_a_new_request_instead_of_trusting_client_headers(self):
        self.client.get(
            "/api/accounts",
            headers={
                "Authorization": "Bearer personal-token",
                "Accept": "application/json",
            },
        )

        forwarded = self.api_service.received[0].headers
        self.assertEqual(forwarded["accept"], "application/json")
        self.assertNotIn("authorization", forwarded)
        self.assertNotIn("cookie", forwarded)

    def test_forwards_the_method_query_and_body_and_returns_the_status(self):
        self.api_service.status = 201
        self.api_service.body = b'{"id": 1}'

        response = self.client.post(
            "/api/expenses?dry_run=1&tag=a&tag=b",
            data='{"amount": "12.50"}',
            content_type="application/json",
        )

        forwarded = self.api_service.received[0]
        self.assertEqual(forwarded.method, "POST")
        self.assertEqual(forwarded.path, "/api/expenses?dry_run=1&tag=a&tag=b")
        self.assertEqual(forwarded.body, b'{"amount": "12.50"}')
        self.assertEqual(forwarded.headers["content-type"], "application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"id": 1})


class SessionWriteCsrfTests(SessionGatewayTestCase):
    def setUp(self):
        super().setUp()
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.ana)

    def test_a_session_write_without_a_valid_csrf_token_is_rejected_in_webapp(self):
        token = self.client.get("/auth/session").json()["csrf_token"]
        for header in ({}, {"X-CSRFToken": "forged" * 8}):
            with self.subTest(header=header):
                response = self.client.post(
                    "/api/expenses", data="{}", content_type="application/json", headers=header
                )

                self.assertEqual(response.status_code, 403)
        self.assertEqual(self.api_service.received, [])

        accepted = self.client.post(
            "/api/expenses",
            data="{}",
            content_type="application/json",
            headers={"X-CSRFToken": token},
        )
        self.assertEqual(accepted.status_code, 200)
