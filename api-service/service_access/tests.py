from unittest import mock

from django.test import SimpleTestCase, override_settings


@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ServiceCredentialTests(SimpleTestCase):
    def test_rejects_a_request_without_the_service_credential(self):
        response = self.client.get("/api/accounts")

        self.assertEqual(response.status_code, 403)

    def test_rejects_a_request_with_a_wrong_service_credential(self):
        response = self.client.get(
            "/api/accounts", headers={"X-Okane-Service-Key": "guessed-key"}
        )

        self.assertEqual(response.status_code, 403)

    def test_lets_a_request_from_webapp_reach_the_router(self):
        response = self.client.get(
            "/api/no-such-endpoint",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "7"},
        )

        # The router answers, not the guard.
        self.assertEqual(response.status_code, 404)

    def test_rejects_a_request_from_webapp_without_a_user_identity(self):
        response = self.client.get(
            "/api/accounts", headers={"X-Okane-Service-Key": "expected-key"}
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {"detail": "invalid_user_identity"})

    def test_rejects_a_malformed_user_identity(self):
        for identity in ("", "abc", "0", "-3", "7 ", "1.5", "٣"):
            with self.subTest(identity=identity):
                response = self.client.get(
                    "/api/accounts",
                    headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": identity},
                )

                self.assertEqual(response.status_code, 403)

    def test_a_user_identity_without_the_service_credential_is_rejected(self):
        response = self.client.get(
            "/api/accounts",
            headers={"X-Okane-Service-Key": "guessed-key", "X-Okane-User-Id": "7"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json(), {"detail": "invalid_service_credential"})

    def test_health_needs_no_user_identity(self):
        with mock.patch("health.views.database_is_reachable", return_value=True):
            response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)

    def test_health_rejects_writes(self):
        response = self.client.post("/api/health")

        self.assertEqual(response.status_code, 405)

    @override_settings(INTERNAL_SERVICE_KEY="")
    def test_an_empty_configured_key_admits_nobody(self):
        without_header = self.client.get("/api/accounts")
        with_empty_header = self.client.get(
            "/api/accounts", headers={"X-Okane-Service-Key": ""}
        )

        self.assertEqual(without_header.status_code, 403)
        self.assertEqual(with_empty_header.status_code, 403)
