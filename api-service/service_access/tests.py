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
            "/api/accounts", headers={"X-Okane-Service-Key": "expected-key"}
        )

        # No financial endpoint exists yet, so the router answers, not the guard.
        self.assertEqual(response.status_code, 404)

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
