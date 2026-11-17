from django.test import Client, tag

from gateway.tests import StubApiServiceMixin
from preferences.models import UserPreferences
from users.models import User
from users.tests import PASSWORD, AuthTestCase

VALID = {
    "movement_type": "expense",
    "account_id": 7,
    "period": "custom",
    "from": "2026-10-01",
    "to": "2026-10-31",
    "grouping": "type",
    "visible_sections": ["available", "accounts"],
}


@tag("database")
class PreferencesTestCase(StubApiServiceMixin, AuthTestCase):
    def setUp(self):
        super().setUp()
        self.api_service.body = b'{"id": 7}'
        self.register()
        self.user = User.objects.get(email="ana@example.com")

    def put(self, data, client=None):
        client = client or self.client
        return client.put(
            "/api/settings/preferences",
            data=data,
            content_type="application/json",
            headers={"X-CSRFToken": self.csrf_token(client)},
        )

    def get(self, client=None):
        return (client or self.client).get("/api/settings/preferences")

    def second_user_client(self):
        client = Client(enforce_csrf_checks=True)
        self.register("bea@example.com", client=client)
        return client


class ReadPreferencesTests(PreferencesTestCase):
    def test_a_user_without_saved_preferences_gets_the_initial_values(self):
        response = self.get()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "movement_type": None,
                "account_id": None,
                "period": "current_month",
                "from": None,
                "to": None,
                "grouping": "date",
                "visible_sections": ["available", "budgets", "net_worth", "upcoming", "accounts"],
            },
        )
        self.assertFalse(UserPreferences.objects.exists())

    def test_reading_needs_a_session(self):
        response = Client().get("/api/settings/preferences")

        self.assertEqual(response.status_code, 401)


class SavePreferencesTests(PreferencesTestCase):
    def test_saved_preferences_are_read_back_and_survive_a_new_session(self):
        saved = self.put(VALID)

        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json(), VALID)
        self.client.post(
            "/auth/logout", headers={"X-CSRFToken": self.csrf_token()}, content_type="application/json"
        )
        self.login()
        self.assertEqual(self.get().json(), VALID)

    def test_saving_again_replaces_the_previous_preferences(self):
        self.put(VALID)

        self.put({**VALID, "movement_type": None, "account_id": None, "period": "all"})

        self.assertEqual(UserPreferences.objects.count(), 1)
        saved = self.get().json()
        self.assertEqual((saved["movement_type"], saved["period"], saved["from"]), (None, "all", None))

    def test_two_users_keep_their_own_preferences(self):
        bea = self.second_user_client()
        self.put(VALID)

        self.put({**VALID, "grouping": "date", "visible_sections": []}, client=bea)

        self.assertEqual(self.get().json(), VALID)
        self.assertEqual(self.get(client=bea).json()["visible_sections"], [])

    def test_saving_needs_the_csrf_token(self):
        response = self.client.put(
            "/api/settings/preferences", data=VALID, content_type="application/json"
        )

        self.assertEqual(response.status_code, 403)

    def test_invalid_values_are_listed_by_field_and_nothing_is_saved(self):
        response = self.put(
            {
                "movement_type": "loan",
                "account_id": "7",
                "period": "forever",
                "grouping": "month",
                "visible_sections": ["available", "secret"],
            }
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            set(response.json()["errors"]),
            {"movement_type", "account_id", "period", "grouping", "visible_sections"},
        )
        self.assertFalse(UserPreferences.objects.exists())

    def test_a_custom_period_needs_valid_days_in_order(self):
        for period, field in (
            ({"from": "2026-13-01", "to": None}, "from"),
            ({"from": "2026-11-05", "to": "2026-11-01"}, "to"),
            ({"from": None, "to": None}, "period"),
        ):
            with self.subTest(period=period):
                response = self.put({**VALID, "period": "custom", **period})

                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()["errors"])

    def test_a_relative_period_keeps_no_days(self):
        saved = self.put({**VALID, "period": "current_month"}).json()

        self.assertEqual((saved["from"], saved["to"]), (None, None))

    def test_an_unreadable_body_is_rejected(self):
        response = self.put("[1, 2]")

        self.assertEqual(response.status_code, 400)

    def test_an_account_that_is_not_the_users_is_rejected(self):
        self.api_service.status = 404

        response = self.put(VALID)

        self.assertEqual(response.status_code, 400)
        self.assertIn("account_id", response.json()["errors"])
        asked = self.api_service.received[0]
        self.assertEqual(asked.path, "/api/accounts/7")
        self.assertEqual(asked.headers["x-okane-user-id"], str(self.user.pk))
        self.assertFalse(UserPreferences.objects.exists())

    def test_no_account_is_asked_for_when_none_is_chosen(self):
        self.put({**VALID, "account_id": None})

        self.assertEqual(self.api_service.received, [])

    def test_an_unreachable_api_service_is_reported_not_saved(self):
        self.api_service.stop()

        response = self.put(VALID)

        self.assertEqual(response.status_code, 502)
        self.assertFalse(UserPreferences.objects.exists())


class ErasurePreferencesTests(PreferencesTestCase):
    def test_deleting_the_user_erases_their_preferences_only(self):
        bea = self.second_user_client()
        self.put(VALID)
        self.put(VALID, client=bea)
        self.api_service.status = 204
        self.api_service.body = b""

        response = self.client.delete(
            "/users/me",
            data={"password": PASSWORD},
            content_type="application/json",
            headers={"X-CSRFToken": self.csrf_token()},
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(
            list(UserPreferences.objects.values_list("user__email", flat=True)), ["bea@example.com"]
        )
