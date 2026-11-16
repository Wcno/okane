from django.test import SimpleTestCase, override_settings

from gateway.stub_api_service import StubApiService


class GatewayTestCase(SimpleTestCase):
    def setUp(self):
        self.api_service = StubApiService().start()
        self.addCleanup(self.api_service.stop)
        settings = override_settings(
            API_SERVICE_URL=self.api_service.url,
            INTERNAL_SERVICE_KEY="expected-key",
        )
        settings.enable()
        self.addCleanup(settings.disable)


class ForwardingTests(GatewayTestCase):
    def test_health_returns_the_answer_of_api_service(self):
        self.api_service.body = (
            b'{"status": "ok", "service": "api-service", "database": "ok"}'
        )

        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "api-service", "database": "ok"},
        )
        self.assertEqual(self.api_service.received[0].path, "/api/health")

    def test_names_api_service_when_it_cannot_be_reached(self):
        self.api_service.stop()

        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json(), {"status": "unavailable", "service": "api-service"}
        )

    def test_builds_a_new_request_instead_of_trusting_client_headers(self):
        self.client.cookies["sessionid"] = "browser-session"

        self.client.get(
            "/api/accounts",
            headers={
                "X-Okane-Service-Key": "forged-key",
                "Authorization": "Bearer personal-token",
                "Accept": "application/json",
            },
        )

        forwarded = self.api_service.received[0].headers
        self.assertEqual(forwarded["x-okane-service-key"], "expected-key")
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

    def test_a_path_cannot_climb_out_of_the_api_prefix(self):
        for path in ("/api/../internal/users", "/api/accounts/../../internal"):
            with self.subTest(path=path):
                response = self.client.get(path)

                self.assertEqual(response.status_code, 404)
        self.assertEqual(self.api_service.received, [])
