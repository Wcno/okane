from datetime import UTC, datetime, timedelta
from unittest import mock

from django.test import Client, TestCase, override_settings, tag

PASSWORD = "correct-horse-battery"


@tag("database")
@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class AuthTestCase(TestCase):
    """Talks to webapp as a browser does: CSRF checks stay on."""

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)

    def csrf_token(self, client=None):
        return (client or self.client).get("/auth/session").json()["csrf_token"]

    def post(self, path, data=None, client=None):
        client = client or self.client
        return client.post(
            path,
            data=data or {},
            content_type="application/json",
            headers={"X-CSRFToken": self.csrf_token(client)},
        )

    def register(self, email="ana@example.com", password=PASSWORD, client=None):
        return self.post(
            "/auth/register", {"email": email, "password": password}, client
        )

    def login(self, email="ana@example.com", password=PASSWORD, client=None):
        return self.post("/auth/login", {"email": email, "password": password}, client)


class RegisterTests(AuthTestCase):
    def test_registering_opens_a_session_for_the_new_user(self):
        response = self.register("ana@example.com")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["email"], "ana@example.com")
        session = self.client.get("/auth/session").json()
        self.assertEqual(session["user"]["email"], "ana@example.com")

    def test_the_email_is_stored_lowercase(self):
        response = self.register("  Ana@Example.COM ")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["email"], "ana@example.com")

    def test_an_email_already_used_in_any_case_is_rejected_with_a_message(self):
        self.register("ana@example.com", client=Client(enforce_csrf_checks=True))

        response = self.register("ANA@example.com")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["errors"]["email"],
            ["Ya existe un usuario con este correo. Inicia sesión o regístrate con otro correo."],
        )
        self.assertIsNone(self.client.get("/auth/session").json()["user"])

    def test_a_password_shorter_than_ten_characters_is_rejected(self):
        response = self.register(password="k7#qL9!x")

        self.assertEqual(response.status_code, 400)
        self.assertIn("10", " ".join(response.json()["errors"]["password"]))

    def test_a_common_numeric_or_empty_password_is_rejected(self):
        for password in ("password123", "8462095713", ""):
            with self.subTest(password=password):
                response = self.register(password=password)

                self.assertEqual(response.status_code, 400)
                self.assertIn("password", response.json()["errors"])

    def test_an_invalid_email_names_the_field_and_gives_an_example(self):
        response = self.register("ana.example.com")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["errors"],
            {"email": ["Escribe un correo válido, por ejemplo ana@ejemplo.com."]},
        )

    def test_an_email_longer_than_the_column_is_rejected_as_invalid(self):
        response = self.register(f"{'a' * 64}@{'b' * 63}.{'c' * 63}.{'d' * 63}.com")

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json()["errors"])

    def test_the_password_never_appears_in_the_response(self):
        response = self.register(password=PASSWORD)

        self.assertNotIn(PASSWORD, response.content.decode())

    def test_registering_without_a_csrf_token_is_rejected(self):
        self.client.get("/auth/session")

        response = self.client.post(
            "/auth/register",
            {"email": "ana@example.com", "password": PASSWORD},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIsNone(self.client.get("/auth/session").json()["user"])

    def test_registering_with_a_forged_csrf_token_is_rejected(self):
        self.client.get("/auth/session")

        response = self.client.post(
            "/auth/register",
            {"email": "ana@example.com", "password": PASSWORD},
            content_type="application/json",
            headers={"X-CSRFToken": "forged" * 8},
        )

        self.assertEqual(response.status_code, 403)


class LoginTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register(client=Client(enforce_csrf_checks=True))

    def test_logging_in_opens_a_session(self):
        response = self.login("ANA@example.com")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "ana@example.com")
        self.assertEqual(
            self.client.get("/auth/session").json()["user"]["email"], "ana@example.com"
        )

    def test_a_wrong_password_and_an_unknown_email_get_the_same_answer(self):
        wrong_password = self.login(password="not-the-password")
        unknown_email = self.login("nadie@example.com")

        self.assertEqual(wrong_password.status_code, 400)
        self.assertEqual(unknown_email.status_code, wrong_password.status_code)
        self.assertEqual(unknown_email.content, wrong_password.content)
        self.assertEqual(
            wrong_password.json(),
            {
                "errors": {
                    "form": [
                        "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo."
                    ]
                }
            },
        )
        self.assertIsNone(self.client.get("/auth/session").json()["user"])

    def test_an_overlong_email_gets_the_usual_failure(self):
        response = self.login("a" * 300 + "@example.com")

        self.assertEqual(response.status_code, 400)
        self.assertIn("no coinciden", response.json()["errors"]["form"][0])

    def test_the_session_cookie_is_http_only_and_same_site(self):
        self.login()

        cookie = self.client.cookies["sessionid"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["max-age"], 14 * 24 * 60 * 60)
        # WEBAPP_HTTPS is off by default, so local http:// keeps working.
        self.assertFalse(cookie["secure"])
        self.assertTrue(self.client.cookies["csrftoken"]["httponly"])

    def test_logging_in_without_a_csrf_token_is_rejected(self):
        self.client.get("/auth/session")

        response = self.client.post(
            "/auth/login",
            {"email": "ana@example.com", "password": PASSWORD},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("Recarga la página", response.json()["errors"]["form"][0])


class LoginRateLimitTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.now = datetime(2026, 11, 16, 9, 0, tzinfo=UTC)
        clock = mock.patch("django.utils.timezone.now", side_effect=lambda: self.now)
        clock.start()
        self.addCleanup(clock.stop)
        self.register(client=Client(enforce_csrf_checks=True))

    def fail_logins(self, count, email="ana@example.com", origin="203.0.113.7"):
        for _ in range(count):
            self.login_from(origin, email, "not-the-password")

    def login_from(self, origin, email="ana@example.com", password=PASSWORD):
        client = Client(enforce_csrf_checks=True, REMOTE_ADDR=origin)
        return self.login(email, password, client=client)

    def test_the_sixth_failure_in_a_row_for_an_email_is_refused_with_retry_after(self):
        for origin in ("203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4"):
            self.fail_logins(1, origin=origin)
        self.now += timedelta(minutes=5)
        self.fail_logins(1, origin="203.0.113.5")

        response = self.login_from("203.0.113.6")

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], str(10 * 60))
        self.assertIn("15 minutos", response.json()["errors"]["form"][0])

    def test_an_unknown_email_is_limited_with_the_same_answer(self):
        self.fail_logins(5, email="ana@example.com", origin="203.0.113.1")
        self.fail_logins(5, email="nadie@example.com", origin="203.0.113.2")

        known = self.login_from("203.0.113.3", "ana@example.com")
        unknown = self.login_from("203.0.113.4", "nadie@example.com")

        self.assertEqual(known.status_code, 429)
        self.assertEqual(unknown.status_code, 429)
        self.assertEqual(known.content, unknown.content)
        self.assertEqual(known["Retry-After"], unknown["Retry-After"])

    def test_five_failures_from_one_origin_limit_every_email_from_it(self):
        for number in range(5):
            self.fail_logins(1, email=f"intento{number}@example.com")

        response = self.login_from("203.0.113.7")
        elsewhere = self.login_from("198.51.100.1")

        self.assertEqual(response.status_code, 429)
        self.assertEqual(elsewhere.status_code, 200)

    def test_the_limit_ends_with_its_window_and_a_success_resets_the_count(self):
        self.fail_logins(5)
        self.assertEqual(self.login_from("203.0.113.7").status_code, 429)

        self.now += timedelta(minutes=15)
        self.assertEqual(self.login_from("203.0.113.7").status_code, 200)

        self.fail_logins(4)
        self.assertEqual(self.login_from("203.0.113.7").status_code, 200)

    def test_a_success_inside_the_window_resets_the_email_count(self):
        for number in range(4):
            self.fail_logins(1, origin=f"203.0.113.{number + 1}")
        self.assertEqual(self.login_from("198.51.100.1").status_code, 200)

        for number in range(4):
            self.fail_logins(1, origin=f"203.0.113.{number + 11}")

        self.assertEqual(self.login_from("198.51.100.2").status_code, 200)

    def test_a_success_inside_the_window_resets_the_origin_count(self):
        for number in range(4):
            self.fail_logins(1, email=f"intento{number}@example.com")
        self.assertEqual(self.login_from("203.0.113.7").status_code, 200)

        for number in range(4, 8):
            self.fail_logins(1, email=f"intento{number}@example.com")

        self.assertEqual(self.login_from("203.0.113.7").status_code, 200)

    def test_failures_spread_over_more_than_the_window_do_not_add_up(self):
        self.fail_logins(4)
        self.now += timedelta(minutes=16)
        self.fail_logins(1)

        self.assertEqual(self.login_from("203.0.113.7").status_code, 200)


class SessionExpiryTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.now = datetime(2026, 11, 16, 9, 0, tzinfo=UTC)
        clock = mock.patch("django.utils.timezone.now", side_effect=lambda: self.now)
        clock.start()
        self.addCleanup(clock.stop)
        self.register()

    def current_user(self):
        return self.client.get("/auth/session").json()["user"]

    def test_each_use_renews_the_session(self):
        for _ in range(3):
            self.now += timedelta(days=13)
            self.assertIsNotNone(self.current_user())

    def test_the_session_ends_after_fourteen_days_without_use(self):
        self.now += timedelta(days=14, seconds=1)

        self.assertIsNone(self.current_user())


class LogoutTests(AuthTestCase):
    def test_logging_out_ends_the_session(self):
        self.register()

        response = self.post("/auth/logout")

        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self.client.get("/auth/session").json()["user"])

    def test_a_copied_session_cookie_stops_working_after_logout(self):
        self.register()
        stolen = Client()
        stolen.cookies["sessionid"] = self.client.cookies["sessionid"].value
        self.assertIsNotNone(stolen.get("/auth/session").json()["user"])

        self.post("/auth/logout")

        self.assertIsNone(stolen.get("/auth/session").json()["user"])

    def test_logging_out_without_a_csrf_token_keeps_the_session(self):
        self.register()

        response = self.client.post("/auth/logout")

        self.assertEqual(response.status_code, 403)
        self.assertIsNotNone(self.client.get("/auth/session").json()["user"])
