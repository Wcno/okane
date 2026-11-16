from django.test import Client, TestCase, override_settings, tag

from config.https import https_settings
from users.models import User

PASSWORD = "correct-horse-battery"


@tag("database")
@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class HttpsBehindProxyTests(TestCase):
    """WEBAPP_HTTPS assumes a reverse proxy that terminates TLS (README)."""

    def setUp(self):
        User.objects.create_user("ana@example.com", PASSWORD)
        self.client = Client(enforce_csrf_checks=True)

    def login_through_proxy(self):
        # The proxy forwards the public Host along with the original scheme.
        proxy_headers = {"Host": "testserver", "X-Forwarded-Proto": "https"}
        token = self.client.get("/auth/session", headers=proxy_headers).json()["csrf_token"]
        return self.client.post(
            "/auth/login",
            {"email": "ana@example.com", "password": PASSWORD},
            content_type="application/json",
            headers={**proxy_headers, "X-CSRFToken": token, "Origin": "https://testserver"},
        )

    def test_with_https_on_a_login_from_the_https_origin_succeeds_with_secure_cookies(self):
        with override_settings(**https_settings(True)):
            response = self.login_through_proxy()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.client.cookies["sessionid"]["secure"])
        self.assertTrue(self.client.cookies["csrftoken"]["secure"])

    def test_with_https_off_the_forwarded_scheme_is_ignored_and_cookies_are_not_secure(self):
        with override_settings(**https_settings(False)):
            response = self.login_through_proxy()
            plain = Client()
            plain.get("/auth/session")

        # Django sees plain HTTP, so an https Origin is not its own.
        self.assertEqual(response.status_code, 403)
        self.assertFalse(plain.cookies["csrftoken"]["secure"])
