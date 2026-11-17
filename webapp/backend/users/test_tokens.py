from unittest import mock

from django.test import Client

from gateway.tests import StubApiServiceMixin
from gateway.upstream import api_service
from users import recovery, tokens
from users.models import PersonalToken, User
from users.tests import PASSWORD, AuthTestCase

NEW_PASSWORD = "staple-battery-horse"


class TokenTestCase(StubApiServiceMixin, AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register()
        self.ana = User.objects.get(email="ana@example.com")

    def create(self, name="Google Sheets", scopes=("finance:read",), client=None):
        return self.post("/api/settings/tokens", {"name": name, "scopes": list(scopes)}, client)

    def revoke(self, token_id, client=None):
        client = client or self.client
        return client.delete(f"/api/settings/tokens/{token_id}", headers={"X-CSRFToken": self.csrf_token(client)})

    def call_api(self, secret):
        return Client().get("/api/v1/accounts", headers={"Authorization": f"Bearer {secret}"})


class CreateAndListTests(TokenTestCase):
    def test_the_secret_is_shown_once_and_only_its_hash_is_stored(self):
        response = self.create(scopes=("finance:read", "movements:create"))

        self.assertEqual(response.status_code, 201)
        body = response.json()
        secret = body["secret"]
        self.assertTrue(secret.startswith("okt_"))
        self.assertEqual(body["token"]["scopes"], ["finance:read", "movements:create"])
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        stored = PersonalToken.objects.get()
        self.assertNotIn(secret, {stored.secret_hash, stored.prefix, stored.name})
        self.assertNotIn(secret.split("_", 2)[2], stored.secret_hash)
        self.assertEqual(self.call_api(secret).status_code, 200)

    def test_the_list_names_each_token_and_never_shows_a_secret(self):
        secret = self.create().json()["secret"]
        self.create(name="Otro")

        listed = self.client.get("/api/settings/tokens")

        self.assertEqual(listed.status_code, 200)
        self.assertNotIn(secret.split("_", 2)[2], listed.content.decode())
        results = listed.json()["results"]
        self.assertEqual([token["name"] for token in results], ["Otro", "Google Sheets"])
        self.assertEqual(
            set(results[0]), {"id", "name", "prefix", "scopes", "created_at", "revoked_at"}
        )

    def test_a_user_sees_only_their_own_tokens(self):
        tokens.issue(User.objects.create_user("bruno@example.com", PASSWORD), "Ajeno", ["finance:read"])

        self.assertEqual(self.client.get("/api/settings/tokens").json()["results"], [])

    def test_the_permissions_and_the_name_are_validated(self):
        for name, scopes in (("", ["finance:read"]), ("   ", ["finance:read"]), ("x" * 61, ["finance:read"]),
                             ("Script", []), ("Script", ["admin"]), ("Script", "finance:read")):
            with self.subTest(name=name, scopes=scopes):
                response = self.post("/api/settings/tokens", {"name": name, "scopes": scopes})

                self.assertEqual(response.status_code, 400)
        self.assertEqual(PersonalToken.objects.count(), 0)

    def test_managing_tokens_needs_a_session_and_a_csrf_token(self):
        anonymous = Client(enforce_csrf_checks=True)
        self.assertEqual(anonymous.get("/api/settings/tokens").status_code, 401)
        self.assertEqual(self.create(client=anonymous).status_code, 401)

        without_csrf = self.client.post(
            "/api/settings/tokens", data={"name": "x", "scopes": ["finance:read"]}, content_type="application/json"
        )

        self.assertEqual(without_csrf.status_code, 403)
        self.assertEqual(PersonalToken.objects.count(), 0)


class RevocationTests(TokenTestCase):
    def test_revoking_blocks_the_token_at_once_and_keeps_it_in_the_list(self):
        created = self.create().json()

        response = self.revoke(created["token"]["id"])

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.call_api(created["secret"]).status_code, 401)
        listed = self.client.get("/api/settings/tokens").json()["results"][0]
        self.assertIsNotNone(listed["revoked_at"])

    def test_a_token_of_another_user_cannot_be_revoked(self):
        other = User.objects.create_user("bruno@example.com", PASSWORD)
        token, secret = tokens.issue(other, "Ajeno", ["finance:read"])

        self.assertEqual(self.revoke(token.pk).status_code, 404)
        self.assertEqual(self.call_api(secret).status_code, 200)

    def test_signing_out_does_not_revoke_tokens(self):
        secret = self.create().json()["secret"]

        self.assertEqual(self.post("/auth/logout").status_code, 204)

        self.assertEqual(self.call_api(secret).status_code, 200)

    def test_changing_the_password_revokes_every_token(self):
        secrets = [self.create(name=f"t{n}").json()["secret"] for n in range(2)]

        response = self.client.put(
            "/auth/password",
            data={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            content_type="application/json",
            headers={"X-CSRFToken": self.csrf_token()},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([self.call_api(secret).status_code for secret in secrets], [401, 401])

    def test_resetting_the_password_revokes_every_token(self):
        secret = self.create().json()["secret"]
        link_token = f"{self.ana.pk}-{recovery.token_generator.make_token(self.ana)}"

        response = self.post("/auth/reset-password", {"token": link_token, "password": NEW_PASSWORD})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.call_api(secret).status_code, 401)


class DeleteUserTests(TokenTestCase):
    def test_deleting_the_user_blocks_the_tokens_before_the_data_is_erased_and_removes_them(self):
        self.api_service.status = 204
        self.api_service.body = b""
        secret = self.create().json()["secret"]
        seen_while_erasing = []
        ask = api_service.delete

        def erase(*args, **kwargs):
            seen_while_erasing.append(self.call_api(secret).status_code)
            return ask(*args, **kwargs)

        with mock.patch("gateway.erasure.api_service.delete", side_effect=erase):
            response = self.client.delete(
                "/users/me",
                data={"password": PASSWORD},
                content_type="application/json",
                headers={"X-CSRFToken": self.csrf_token()},
            )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(seen_while_erasing, [401])
        self.assertEqual(PersonalToken.objects.count(), 0)
        self.assertEqual(self.call_api(secret).status_code, 401)
