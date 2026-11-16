import contextlib
import io
import re
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from datetime import UTC, datetime, timedelta
from unittest import mock

from django.core import mail
from django.db import connections
from django.test import Client, TransactionTestCase, override_settings, skipUnlessDBFeature

from config.mail import mail_settings
from users.tests import PASSWORD, AuthTestCase
from users import recovery
from users.models import User

NEW_PASSWORD = "staple-battery-horse"
RESET_LINK = re.compile(r"http://okane\.test/reset-password/(\S+)")


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class ConcurrentResetTests(TransactionTestCase):
    @skipUnlessDBFeature("has_select_for_update")
    def test_simultaneous_requests_can_only_consume_a_link_once(self):
        user = User.objects.create_user("concurrent@example.com", PASSWORD)
        token = f"{user.pk}-{recovery.token_generator.make_token(user)}"
        validated = Barrier(2)
        original_lookup = recovery.user_for_token

        def overlapping_lookup(value):
            result = original_lookup(value)
            validated.wait(timeout=10)
            return result

        def reset(password):
            try:
                client = Client(enforce_csrf_checks=True)
                csrf = client.get("/auth/session").json()["csrf_token"]
                response = client.post(
                    "/auth/reset-password",
                    {"token": token, "password": password},
                    content_type="application/json",
                    headers={"X-CSRFToken": csrf},
                )
                return response.status_code, password
            finally:
                connections.close_all()

        with mock.patch("users.recovery.user_for_token", side_effect=overlapping_lookup):
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(reset, ["first-new-password", "second-new-password"]))

        self.assertEqual(sorted(status for status, _ in results), [200, 400])
        user.refresh_from_db()
        winner = next(password for status, password in results if status == 200)
        self.assertTrue(user.check_password(winner))
        self.assertIsNone(original_lookup(token))


@override_settings(PUBLIC_ORIGIN="http://okane.test")
class PasswordTestCase(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.register(client=Client(enforce_csrf_checks=True))

    def forgot_password(self, email="ana@example.com", client=None):
        return self.post("/auth/forgot-password", {"email": email}, client)

    def reset_token(self, email="ana@example.com"):
        """Ask for a reset link and return the token of the one that was mailed."""
        mail.outbox.clear()
        self.forgot_password(email)
        return RESET_LINK.search(mail.outbox[0].body).group(1)


class ForgotPasswordTests(PasswordTestCase):
    def test_a_registered_email_receives_a_link_to_the_configured_origin(self):
        # A forged Host must not end up in the link.
        client = Client(enforce_csrf_checks=True, HTTP_HOST="localhost")

        response = self.forgot_password("ANA@example.com", client=client)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ana@example.com"])
        self.assertRegex(mail.outbox[0].body, RESET_LINK)

    def test_an_unknown_email_gets_the_same_answer_and_no_message(self):
        known = self.forgot_password("ana@example.com")
        mail.outbox.clear()

        unknown = self.forgot_password("nadie@example.com")

        self.assertEqual(unknown.status_code, known.status_code)
        self.assertEqual(unknown.content, known.content)
        self.assertEqual(mail.outbox, [])

    def test_a_malformed_email_names_the_field(self):
        response = self.forgot_password("ana.example.com")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["errors"],
            {"email": ["Escribe un correo válido, por ejemplo ana@ejemplo.com."]},
        )

    def test_asking_without_a_csrf_token_is_rejected(self):
        self.client.get("/auth/session")

        response = self.client.post(
            "/auth/forgot-password", {"email": "ana@example.com"}, content_type="application/json"
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(mail.outbox, [])

    def test_in_development_the_message_is_printed_to_the_console(self):
        console = mail_settings(host="", port="587", user="", password="", use_tls=True, sender="Okane <no-reply@localhost>")

        with override_settings(**console), contextlib.redirect_stdout(io.StringIO()) as printed:
            self.forgot_password()

        self.assertIn("To: ana@example.com", printed.getvalue())
        self.assertRegex(printed.getvalue(), RESET_LINK)

    def test_a_mail_server_failure_gets_the_usual_answer(self):
        with (
            override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend", EMAIL_HOST="127.0.0.1", EMAIL_PORT=1, EMAIL_TIMEOUT=1),
            self.assertLogs("users.recovery", level="ERROR"),
        ):
            response = self.forgot_password()

        self.assertEqual(response.status_code, 204)


class ResetPasswordTests(PasswordTestCase):
    INVALID_LINK = {
        "errors": {
            "form": ["Este enlace ya no sirve: se usó o caducó. Pide uno nuevo para restablecer tu contraseña."]
        }
    }

    def setUp(self):
        super().setUp()
        self.now = datetime(2026, 11, 16, 9, 0, tzinfo=UTC)
        clock = mock.patch("django.utils.timezone.now", side_effect=lambda: self.now)
        clock.start()
        self.addCleanup(clock.stop)

    def reset_password(self, token, password=NEW_PASSWORD, client=None):
        return self.post("/auth/reset-password", {"token": token, "password": password}, client)

    def test_a_valid_link_sets_the_new_password(self):
        token = self.reset_token()

        response = self.reset_password(token)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["user"])
        self.assertEqual(self.login(password=PASSWORD).status_code, 400)
        self.assertEqual(self.login(password=NEW_PASSWORD).status_code, 200)

    def test_a_used_link_is_rejected(self):
        token = self.reset_token()
        self.reset_password(token)

        again = self.reset_password(token, "another-fine-password")

        self.assertEqual(again.status_code, 400)
        self.assertEqual(again.json(), self.INVALID_LINK)
        self.assertEqual(self.login(password=NEW_PASSWORD).status_code, 200)

    def test_a_link_works_until_the_hour_ends_and_not_after(self):
        token = self.reset_token()

        self.now += timedelta(hours=1, seconds=1)
        expired = self.reset_password(token)
        self.now -= timedelta(seconds=1)
        at_the_limit = self.reset_password(token)

        self.assertEqual(expired.status_code, 400)
        self.assertEqual(expired.json(), self.INVALID_LINK)
        self.assertEqual(at_the_limit.status_code, 200)

    @override_settings(PASSWORD_RESET_TIMEOUT=5 * 60)
    def test_the_lifetime_of_the_link_is_configurable(self):
        token = self.reset_token()
        self.assertIn("caduca en 5 minutos", mail.outbox[0].body)

        self.now += timedelta(minutes=5, seconds=1)

        self.assertEqual(self.reset_password(token).status_code, 400)

    def test_a_forged_or_malformed_token_is_rejected(self):
        token = self.reset_token()
        user_id, signature = token.split("-", 1)
        altered = signature[:-1] + ("1" if signature.endswith("0") else "0")

        for forged in (f"{int(user_id) + 1}-{signature}", f"{user_id}-{altered}", "", "x", "٣-abc", "1" * 500):
            with self.subTest(token=forged):
                response = self.reset_password(forged)

                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json(), self.INVALID_LINK)
        self.assertEqual(self.login(password=PASSWORD).status_code, 200)

    def test_the_new_password_follows_the_registration_policy(self):
        token = self.reset_token()

        for password in ("k7#qL9!x", "password123", "8462095713", "ana@example.com", ""):
            with self.subTest(password=password):
                response = self.reset_password(token, password)

                self.assertEqual(response.status_code, 400)
                self.assertIn("password", response.json()["errors"])
        # A rejected password does not use the link up.
        self.assertEqual(self.reset_password(token).status_code, 200)

    def test_resetting_ends_every_earlier_session(self):
        phone, laptop = Client(enforce_csrf_checks=True), Client(enforce_csrf_checks=True)
        self.login(client=phone)
        self.login(client=laptop)
        token = self.reset_token()

        self.reset_password(token, client=laptop)

        self.assertIsNone(phone.get("/auth/session").json()["user"])
        self.assertIsNone(laptop.get("/auth/session").json()["user"])

    def test_resetting_lifts_the_login_limit_of_the_user(self):
        for _ in range(5):
            self.login(password="not-the-password")
        self.assertEqual(self.login(password=PASSWORD).status_code, 429)

        self.reset_password(self.reset_token())

        self.assertEqual(self.login(password=NEW_PASSWORD).status_code, 200)

    def test_resetting_without_a_csrf_token_is_rejected(self):
        token = self.reset_token()
        self.client.get("/auth/session")

        response = self.client.post(
            "/auth/reset-password", {"token": token, "password": NEW_PASSWORD}, content_type="application/json"
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.login(password=PASSWORD).status_code, 200)


class ForgotPasswordRateLimitTests(PasswordTestCase):
    def setUp(self):
        super().setUp()
        self.now = datetime(2026, 11, 16, 9, 0, tzinfo=UTC)
        clock = mock.patch("django.utils.timezone.now", side_effect=lambda: self.now)
        clock.start()
        self.addCleanup(clock.stop)
        mail.outbox.clear()

    def ask_from(self, origin, email="ana@example.com"):
        client = Client(enforce_csrf_checks=True, REMOTE_ADDR=origin)
        return self.forgot_password(email, client=client)

    def test_the_sixth_request_for_an_email_is_refused_with_retry_after(self):
        for number in range(4):
            self.ask_from(f"203.0.113.{number + 1}")
        self.now += timedelta(minutes=5)
        self.assertEqual(self.ask_from("203.0.113.5").status_code, 204)

        response = self.ask_from("203.0.113.6")

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], str(10 * 60))
        self.assertIn("15 minutos", response.json()["errors"]["form"][0])
        self.assertEqual(len(mail.outbox), 5)

    def test_an_unknown_email_is_limited_with_the_same_answer(self):
        for number in range(5):
            self.ask_from(f"203.0.113.{number + 1}", "ana@example.com")
            self.ask_from(f"203.0.113.{number + 11}", "nadie@example.com")

        known = self.ask_from("198.51.100.1", "ana@example.com")
        unknown = self.ask_from("198.51.100.2", "nadie@example.com")

        self.assertEqual(known.status_code, 429)
        self.assertEqual(unknown.status_code, 429)
        self.assertEqual(known.content, unknown.content)
        self.assertEqual(known["Retry-After"], unknown["Retry-After"])

    def test_five_requests_from_one_origin_limit_every_email_from_it(self):
        for number in range(5):
            self.ask_from("203.0.113.7", f"intento{number}@example.com")

        response = self.ask_from("203.0.113.7")
        elsewhere = self.ask_from("198.51.100.1")

        self.assertEqual(response.status_code, 429)
        self.assertEqual(elsewhere.status_code, 204)

    def test_the_limit_ends_with_its_window(self):
        for _ in range(5):
            self.ask_from("203.0.113.7")
        self.assertEqual(self.ask_from("203.0.113.7").status_code, 429)

        self.now += timedelta(minutes=15)

        self.assertEqual(self.ask_from("203.0.113.7").status_code, 204)

    def test_using_a_link_resets_the_count_of_its_email_and_origin(self):
        for _ in range(4):
            self.forgot_password()
        token = self.reset_token()
        self.assertEqual(self.forgot_password().status_code, 429)

        self.post("/auth/reset-password", {"token": token, "password": NEW_PASSWORD})

        self.assertEqual(self.forgot_password().status_code, 204)

    def test_failed_logins_and_reset_requests_are_counted_apart(self):
        for _ in range(5):
            self.login(password="not-the-password")
        self.assertEqual(self.login().status_code, 429)

        self.assertEqual(self.forgot_password().status_code, 204)

        for _ in range(4):
            self.forgot_password()
        self.assertEqual(self.forgot_password().status_code, 429)
        self.now += timedelta(minutes=15)
        self.assertEqual(self.login().status_code, 200)


class ChangePasswordTests(PasswordTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def change_password(self, current=PASSWORD, new=NEW_PASSWORD, client=None):
        client = client or self.client
        return client.put(
            "/auth/password",
            data={"current_password": current, "new_password": new},
            content_type="application/json",
            headers={"X-CSRFToken": self.csrf_token(client)},
        )

    def test_the_current_password_is_required_to_set_a_new_one(self):
        response = self.change_password()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "ana@example.com")
        fresh = Client(enforce_csrf_checks=True)
        self.assertEqual(self.login(password=PASSWORD, client=fresh).status_code, 400)
        self.assertEqual(self.login(password=NEW_PASSWORD, client=fresh).status_code, 200)

    def test_a_wrong_or_missing_current_password_changes_nothing(self):
        for current in ("not-the-password", ""):
            with self.subTest(current=current):
                response = self.change_password(current=current)

                self.assertEqual(response.status_code, 400)
                self.assertEqual(
                    response.json()["errors"],
                    {"current_password": ["La contraseña actual no coincide. Revísala e inténtalo de nuevo."]},
                )
        self.assertEqual(self.login(client=Client(enforce_csrf_checks=True)).status_code, 200)

    def test_the_new_password_follows_the_registration_policy(self):
        for password in ("k7#qL9!x", "password123", "8462095713", "ana@example.com", ""):
            with self.subTest(password=password):
                response = self.change_password(new=password)

                self.assertEqual(response.status_code, 400)
                self.assertIn("new_password", response.json()["errors"])
        self.assertEqual(self.login(client=Client(enforce_csrf_checks=True)).status_code, 200)

    def test_changing_keeps_this_session_and_ends_the_others(self):
        other = Client(enforce_csrf_checks=True)
        self.login(client=other)

        self.change_password()

        self.assertEqual(self.client.get("/auth/session").json()["user"]["email"], "ana@example.com")
        self.assertIsNone(other.get("/auth/session").json()["user"])

    def test_changing_makes_an_earlier_reset_link_useless(self):
        token = self.reset_token()

        self.change_password()

        response = self.post("/auth/reset-password", {"token": token, "password": "another-fine-password"})
        self.assertEqual(response.status_code, 400)

    def test_a_visitor_without_a_session_is_refused(self):
        visitor = Client(enforce_csrf_checks=True)

        response = self.change_password(client=visitor)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.login(client=Client(enforce_csrf_checks=True)).status_code, 200)

    def test_changing_without_a_csrf_token_is_rejected(self):
        response = self.client.put(
            "/auth/password",
            data={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.login(client=Client(enforce_csrf_checks=True)).status_code, 200)

    def test_neither_password_appears_in_the_response(self):
        response = self.change_password()

        self.assertNotIn(PASSWORD, response.content.decode())
        self.assertNotIn(NEW_PASSWORD, response.content.decode())
