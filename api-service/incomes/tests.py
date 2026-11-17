import datetime
import json
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings, tag

TODAY = datetime.date(2026, 11, 16)


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class IncomeApiTestCase(TestCase):
    """Calls api-service the way webapp does: service key plus the User's id."""

    def setUp(self):
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)

    def call(self, method, path, data=None, user=1):
        return self.client.generic(
            method,
            path,
            data="" if data is None else json.dumps(data),
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": str(user)},
        )

    def account(self, user=1, **fields):
        body = {
            "name": "Cuenta corriente",
            "type": "spending",
            "opening_balance": "1000.00",
            "opening_date": "2026-11-01",
            **fields,
        }
        response = self.call("POST", "/api/accounts", body, user=user)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def archive(self, account, user=1):
        """Archive an Account the way the User does: deleting one with records."""
        response = self.call("DELETE", f"/api/accounts/{account['id']}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNotNone(response.json()["archived_at"])

    def balance(self, account, user=1):
        listed = self.call("GET", "/api/accounts", user=user).json()["results"]
        return next(item for item in listed if item["id"] == account["id"])["balance"]

    def total_balance(self, user=1):
        listed = self.call("GET", "/api/accounts", user=user).json()["results"]
        return sum((Decimal(item["balance"]) for item in listed), Decimal("0"))

    def register(self, account, user=1, **fields):
        body = {"amount": "12.50", "account_id": account["id"], **fields}
        return self.call("POST", "/api/incomes", body, user=user)

    def registered(self, account, user=1, **fields):
        response = self.register(account, user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def assert_rejected(self, response, field):
        self.assertEqual(response.status_code, 400, response.content)
        errors = response.json()["errors"]
        self.assertEqual(list(errors), [field])
        self.assertTrue(errors[field][0])


class PanamaClockTests(IncomeApiTestCase):
    """The real clock, not the pinned one: 02:00 UTC is still the evening before in Panama."""

    def setUp(self):
        # Skips the pinned clock of the base class on purpose.
        instant = datetime.datetime(2026, 11, 17, 2, 0, tzinfo=datetime.timezone.utc)
        patcher = mock.patch("django.utils.timezone.now", return_value=instant)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_the_date_starts_as_the_day_it_is_in_panama_not_in_utc(self):
        account = self.account(opening_date="2026-11-01")

        self.assertEqual(self.registered(account)["date"], "2026-11-16")

    def test_the_day_that_has_not_started_in_panama_is_in_the_future(self):
        account = self.account(opening_date="2026-11-01")

        self.assert_rejected(self.register(account, date="2026-11-17"), "date")
        self.assertEqual(self.registered(account, date="2026-11-16")["date"], "2026-11-16")


class RegisterIncomeTests(IncomeApiTestCase):
    def test_a_registered_income_raises_the_balance_of_its_account(self):
        account = self.account()

        response = self.register(account, amount="12.50", description="  Salario ")

        self.assertEqual(response.status_code, 201, response.content)
        created = response.json()
        self.assertEqual(
            created,
            {
                "id": created["id"],
                "amount": "12.50",
                "account_id": account["id"],
                "date": "2026-11-16",
                "description": "Salario",
            },
        )
        self.assertEqual(self.balance(account), "1012.50")

    def test_the_date_starts_as_today_and_the_description_is_optional(self):
        created = self.registered(self.account())

        self.assertEqual(created["date"], "2026-11-16")
        self.assertEqual(created["description"], "")

    def test_an_income_has_no_category(self):
        account = self.account()

        created = self.registered(account, category_id=3)

        self.assertNotIn("category_id", created)

    def test_the_balance_keeps_exact_cents(self):
        account = self.account(opening_balance="0.30")

        for _ in range(3):
            self.registered(account, amount="0.10")

        # Binary floating point would leave 0.6000000000000001.
        self.assertEqual(self.balance(account), "0.60")

    def test_a_savings_account_takes_incomes(self):
        account = self.account(type="savings", opening_balance="500.00")

        self.registered(account, amount="40.00")

        self.assertEqual(self.balance(account), "540.00")

    def test_an_income_lifts_the_net_savings_and_touches_no_other_account(self):
        account = self.account(name="Con ingreso")
        other = self.account(name="Sin ingreso", opening_balance="300.00")
        before = self.total_balance()

        self.registered(account, amount="250.00")

        # Net savings is Incomes minus Expenses; with no Expenses it grows by the Income.
        self.assertEqual(self.total_balance() - before, Decimal("250.00"))
        self.assertEqual(self.balance(other), "300.00")

    def test_an_account_with_incomes_is_marked_as_having_records(self):
        account = self.account()
        self.registered(account)

        listed = self.call("GET", "/api/accounts").json()["results"][0]

        self.assertTrue(listed["has_records"])

    def test_an_account_with_incomes_is_archived_instead_of_deleted(self):
        account = self.account()
        self.registered(account, amount="100.00")

        self.archive(account)

        self.assertEqual(self.balance(account), "1100.00")

    def test_incomes_and_expenses_share_one_balance(self):
        account = self.account()
        self.registered(account, amount="100.00")
        expense = self.call(
            "POST", "/api/expenses", {"amount": "30.00", "category_id": 2, "account_id": account["id"]}
        )
        self.assertEqual(expense.status_code, 201, expense.content)

        self.assertEqual(self.balance(account), "1070.00")


class IncomeValidationTests(IncomeApiTestCase):
    def test_requires_an_amount_and_an_account(self):
        response = self.call("POST", "/api/incomes", {})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(sorted(response.json()["errors"]), ["account_id", "amount"])

    def test_rejects_an_amount_that_is_not_positive_or_not_exact_cents(self):
        account = self.account()

        for amount in ("0", "0.00", "-5.00", "10.005", "abc", "", "1e3", "NaN", 12.5, 12, None):
            with self.subTest(amount=amount):
                self.assert_rejected(self.register(account, amount=amount), "amount")

        self.assertEqual(self.balance(account), "1000.00")

    def test_accepts_the_smallest_amount_and_a_large_one(self):
        account = self.account(opening_balance="0.00")

        self.registered(account, amount="0.01")
        self.registered(account, amount="999999999999.99")

        self.assertEqual(self.balance(account), "1000000000000.00")

    def test_rejects_a_date_in_the_future(self):
        account = self.account()

        self.assert_rejected(self.register(account, date="2026-11-17"), "date")

    def test_rejects_a_date_before_the_account_started(self):
        account = self.account(opening_date="2026-11-10")

        self.assert_rejected(self.register(account, date="2026-11-09"), "date")
        self.assertEqual(self.registered(account, date="2026-11-10")["date"], "2026-11-10")

    def test_accepts_today_and_a_past_date(self):
        account = self.account(opening_date="2020-01-01")

        self.assertEqual(self.registered(account, date="2026-11-16")["date"], "2026-11-16")
        self.assertEqual(self.registered(account, date="2020-01-01")["date"], "2020-01-01")

    def test_rejects_an_unreadable_date(self):
        account = self.account()

        for date in ("16/11/2026", "2026-02-30", "", "2026-11-16T10:00:00", 20261116, None):
            with self.subTest(date=date):
                self.assert_rejected(self.register(account, date=date), "date")

    def test_rejects_a_description_over_140_characters(self):
        account = self.account()

        self.assert_rejected(self.register(account, description="x" * 141), "description")
        self.assertEqual(len(self.registered(account, description="x" * 140)["description"]), 140)

    def test_rejects_a_description_that_is_not_text_with_a_message_in_spanish(self):
        account = self.account()

        for description in (None, ["a"], {"a": 1}, True):
            with self.subTest(description=description):
                response = self.register(account, description=description)
                self.assert_rejected(response, "description")
                self.assertIn("descripción", response.json()["errors"]["description"][0])

    def test_rejects_an_investment_account(self):
        broker = self.account(type="investment")

        self.assert_rejected(self.register(broker), "account_id")
        self.assertEqual(self.balance(broker), "1000.00")

    def test_rejects_an_archived_account(self):
        archived = self.account()
        self.registered(archived)
        self.archive(archived)

        self.assert_rejected(self.register(archived), "account_id")
        self.assertEqual(self.balance(archived), "1012.50")

    def test_rejects_an_account_id_that_is_not_an_integer(self):
        account = self.account()

        for value in ("abc", 1.5, True, None):
            with self.subTest(value=value):
                self.assert_rejected(self.register(account, account_id=value), "account_id")

    def test_rejects_a_body_that_is_not_json(self):
        response = self.client.generic(
            "POST",
            "/api/incomes",
            data="{not json",
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"},
        )

        self.assert_rejected(response, "form")


class IncomeIsolationTests(IncomeApiTestCase):
    def test_an_account_of_another_user_answers_not_found_and_changes_nothing(self):
        theirs = self.account(user=2)

        response = self.register(theirs, user=1)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "not_found"})
        self.assertEqual(self.balance(theirs, user=2), "1000.00")
        self.assertEqual(self.call("GET", "/api/incomes", user=2).json()["total"], 0)

    def test_an_account_that_does_not_exist_answers_not_found(self):
        account = self.account()

        self.assertEqual(self.register(account, account_id=999999).status_code, 404)

    def test_not_found_wins_over_the_validation_of_the_other_fields(self):
        theirs = self.account(user=2)
        mine = self.account(user=1)
        income = self.registered(mine)

        registering = self.register(theirs, user=1, amount="0", date="2999-01-01")
        correcting = self.call(
            "PUT",
            f"/api/incomes/{income['id']}",
            {"amount": "0", "account_id": theirs["id"], "date": "2999-01-01"},
        )
        unknown_income = self.call(
            "PUT",
            "/api/incomes/999999",
            {"amount": "0", "account_id": mine["id"], "date": "2999-01-01"},
        )

        self.assertEqual(
            [registering.status_code, correcting.status_code, unknown_income.status_code],
            [404, 404, 404],
        )
        self.assertEqual(self.balance(mine), "1012.50")
        self.assertEqual(self.call("GET", "/api/incomes").json()["total"], 1)

    def test_the_owner_comes_from_webapp_and_never_from_the_body(self):
        account = self.account(user=1)

        self.registered(account, user=1, user_id=2)

        self.assertEqual(self.call("GET", "/api/incomes", user=1).json()["total"], 1)
        self.assertEqual(self.call("GET", "/api/incomes", user=2).json()["total"], 0)


class ListIncomesTests(IncomeApiTestCase):
    def page(self, query="", user=1):
        return self.call("GET", "/api/incomes" + query, user=user)

    def test_lists_the_newest_date_first_and_the_latest_registered_first_within_a_day(self):
        account = self.account(opening_date="2026-01-01")
        old = self.registered(account, date="2026-11-01")
        first_today = self.registered(account, date="2026-11-16")
        later_today = self.registered(account, date="2026-11-16")
        backdated = self.registered(account, date="2026-11-10")

        body = self.page().json()

        self.assertEqual(
            [income["id"] for income in body["results"]],
            [later_today["id"], first_today["id"], backdated["id"], old["id"]],
        )

    def test_returns_fifty_incomes_and_the_total_by_default(self):
        account = self.account()
        for _ in range(51):
            self.registered(account, amount="1.00")

        body = self.page().json()

        self.assertEqual(len(body["results"]), 50)
        self.assertEqual(
            {key: body[key] for key in ("total", "page", "page_size", "next_page")},
            {"total": 51, "page": 1, "page_size": 50, "next_page": 2},
        )
        last = self.page("?page=2").json()
        self.assertEqual(len(last["results"]), 1)
        self.assertIsNone(last["next_page"])

    def test_rejects_a_page_size_or_a_page_out_of_range(self):
        self.registered(self.account())

        for query, field in (("?page_size=500", "page_size"), ("?page_size=0", "page_size"), ("?page=2", "page")):
            with self.subTest(query=query):
                self.assert_rejected(self.page(query), field)

    def test_an_empty_list_is_the_first_page(self):
        self.assertEqual(
            self.page().json(),
            {"results": [], "total": 0, "page": 1, "page_size": 50, "next_page": None},
        )

    def test_a_user_sees_only_their_own_incomes(self):
        mine = self.registered(self.account(user=1), user=1)
        self.registered(self.account(user=2), user=2)

        listed = self.page(user=1).json()

        self.assertEqual([income["id"] for income in listed["results"]], [mine["id"]])
        self.assertEqual(listed["total"], 1)


class ReadIncomeTests(IncomeApiTestCase):
    def test_returns_one_income(self):
        created = self.registered(self.account(), description="Salario")

        response = self.call("GET", f"/api/incomes/{created['id']}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), created)

    def test_an_income_of_another_user_or_unknown_answers_not_found(self):
        theirs = self.registered(self.account(user=2), user=2)

        for income_id in (theirs["id"], 999999):
            with self.subTest(income_id=income_id):
                response = self.call("GET", f"/api/incomes/{income_id}", user=1)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json(), {"detail": "not_found"})


class EditIncomeTests(IncomeApiTestCase):
    def put(self, income, user=1, **fields):
        body = {
            "amount": income["amount"],
            "account_id": income["account_id"],
            "date": income["date"],
            "description": income["description"],
            **fields,
        }
        return self.call("PUT", f"/api/incomes/{income['id']}", body, user=user)

    def test_correcting_the_amount_recalculates_the_balance(self):
        account = self.account()
        income = self.registered(account, amount="100.00")
        self.assertEqual(self.balance(account), "1100.00")

        response = self.put(income, amount="40.25")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {**income, "amount": "40.25"})
        self.assertEqual(self.balance(account), "1040.25")

    def test_correcting_the_date_and_the_description(self):
        account = self.account(opening_date="2026-01-01")
        income = self.registered(account)

        response = self.put(income, date="2026-10-02", description="Intereses")

        self.assertEqual(response.json(), {**income, "date": "2026-10-02", "description": "Intereses"})

    def test_changing_the_account_moves_the_effect_and_updates_both_balances(self):
        source = self.account(name="Origen", opening_balance="1000.00")
        target = self.account(name="Destino", opening_balance="300.00")
        income = self.registered(source, amount="100.00")
        self.assertEqual((self.balance(source), self.balance(target)), ("1100.00", "300.00"))
        total_before = self.total_balance()

        response = self.put(income, account_id=target["id"])

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["account_id"], target["id"])
        self.assertEqual((self.balance(source), self.balance(target)), ("1000.00", "400.00"))
        # Net savings does not move: the same Income, in another Account.
        self.assertEqual(self.total_balance(), total_before)

    def test_correcting_the_amount_moves_the_net_savings_by_the_difference(self):
        account = self.account()
        income = self.registered(account, amount="100.00")
        before = self.total_balance()

        self.put(income, amount="130.00")

        self.assertEqual(self.total_balance() - before, Decimal("30.00"))

    def test_rejects_moving_the_income_into_an_investment_or_archived_account(self):
        account = self.account()
        broker = self.account(type="investment")
        archived = self.account(name="Vieja")
        self.registered(archived)
        self.archive(archived)
        income = self.registered(account, amount="100.00")

        for target in (broker, archived):
            with self.subTest(account=target["name"]):
                self.assert_rejected(self.put(income, account_id=target["id"]), "account_id")

        self.assertEqual(self.balance(account), "1100.00")
        self.assertEqual(self.balance(broker), "1000.00")

    def test_an_income_on_an_account_archived_since_can_still_be_corrected(self):
        account = self.account()
        income = self.registered(account, amount="100.00")
        self.archive(account)

        response = self.put(income, amount="60.00", description="Corregido")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.balance(account), "1060.00")

    def test_applies_the_date_rules_of_a_new_income(self):
        account = self.account(opening_date="2026-11-10")
        other = self.account(name="Otra", opening_date="2026-11-14")
        income = self.registered(account, date="2026-11-11")

        self.assert_rejected(self.put(income, date="2026-11-17"), "date")
        self.assert_rejected(self.put(income, date="2026-11-09"), "date")
        # The date must also follow the Account the Income moves to.
        self.assert_rejected(self.put(income, account_id=other["id"]), "date")
        self.assertEqual(self.put(income, date="2026-11-10").status_code, 200)

    def test_requires_the_same_fields_as_registering(self):
        income = self.registered(self.account())

        response = self.call("PUT", f"/api/incomes/{income['id']}", {})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(sorted(response.json()["errors"]), ["account_id", "amount"])

    def test_requires_the_date_instead_of_assuming_today(self):
        account = self.account(opening_date="2026-01-01")
        income = self.registered(account, date="2026-10-01")
        body = {key: income[key] for key in ("amount", "account_id")}

        response = self.call("PUT", f"/api/incomes/{income['id']}", body)

        self.assert_rejected(response, "date")
        self.assertEqual(self.call("GET", f"/api/incomes/{income['id']}").json()["date"], "2026-10-01")

    def test_rejects_an_invalid_amount_without_changing_anything(self):
        account = self.account()
        income = self.registered(account, amount="100.00")

        self.assert_rejected(self.put(income, amount="0"), "amount")

        self.assertEqual(self.call("GET", f"/api/incomes/{income['id']}").json(), income)
        self.assertEqual(self.balance(account), "1100.00")

    def test_the_income_of_another_user_answers_not_found_and_stays_unchanged(self):
        theirs_account = self.account(user=2)
        theirs = self.registered(theirs_account, user=2, amount="100.00")

        response = self.put(theirs, user=1, amount="1.00")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balance(theirs_account, user=2), "1100.00")

    def test_moving_to_an_account_of_another_user_answers_not_found_and_changes_no_balance(self):
        mine = self.account(user=1)
        theirs = self.account(user=2)
        income = self.registered(mine, amount="100.00")

        response = self.put(income, account_id=theirs["id"])

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balance(mine), "1100.00")
        self.assertEqual(self.balance(theirs, user=2), "1000.00")
        self.assertEqual(self.call("GET", f"/api/incomes/{income['id']}").json(), income)


class DeleteIncomeTests(IncomeApiTestCase):
    def delete(self, income, user=1):
        return self.call("DELETE", f"/api/incomes/{income['id']}", user=user)

    def test_deleting_an_income_restores_the_balance(self):
        account = self.account()
        kept = self.registered(account, amount="10.00")
        removed = self.registered(account, amount="100.00")
        self.assertEqual(self.balance(account), "1110.00")

        response = self.delete(removed)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.balance(account), "1010.00")
        listed = self.call("GET", "/api/incomes").json()
        self.assertEqual([income["id"] for income in listed["results"]], [kept["id"]])
        self.assertEqual(self.call("GET", f"/api/incomes/{removed['id']}").status_code, 404)

    def test_deleting_an_income_lowers_the_net_savings_and_leaves_other_accounts_alone(self):
        source = self.account(name="Origen", opening_balance="1000.00")
        other = self.account(name="Otra", opening_balance="300.00")
        removed = self.registered(source, amount="100.00")
        self.registered(other, amount="40.00")
        before = self.total_balance()

        self.delete(removed)

        self.assertEqual((self.balance(source), self.balance(other)), ("1000.00", "340.00"))
        self.assertEqual(before - self.total_balance(), Decimal("100.00"))

    def test_an_account_without_incomes_left_can_be_deleted_again(self):
        account = self.account()
        income = self.registered(account)
        self.delete(income)

        self.assertEqual(self.call("DELETE", f"/api/accounts/{account['id']}").status_code, 204)

    def test_an_income_on_an_archived_account_can_be_deleted(self):
        account = self.account()
        income = self.registered(account, amount="100.00")
        self.archive(account)

        self.assertEqual(self.delete(income).status_code, 204)
        self.assertEqual(self.balance(account), "1000.00")

    def test_the_income_of_another_user_answers_not_found_and_stays(self):
        theirs_account = self.account(user=2)
        theirs = self.registered(theirs_account, user=2, amount="100.00")

        response = self.delete(theirs, user=1)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balance(theirs_account, user=2), "1100.00")
        self.assertEqual(self.call("GET", "/api/incomes", user=2).json()["total"], 1)

    def test_deleting_twice_answers_not_found_the_second_time(self):
        income = self.registered(self.account())
        self.delete(income)

        self.assertEqual(self.delete(income).status_code, 404)
