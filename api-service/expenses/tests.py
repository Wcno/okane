import datetime
import json
from unittest import mock

from django.test import TestCase, override_settings, tag

TODAY = datetime.date(2026, 11, 16)



class InitialCategory:
    """One of the User 1's initial Categories, by key: ids are per User, so tests ask for them."""

    def __init__(self, key):
        self.key = key

    def __get__(self, test, owner):
        return test.initial_category(self.key) if test else self


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ExpenseApiTestCase(TestCase):
    """Calls api-service the way webapp does: service key plus the User's id."""

    def setUp(self):
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)

    HOUSING = InitialCategory("housing")
    FOOD = InitialCategory("food")
    TRANSPORT = InitialCategory("transport")
    UTILITIES = InitialCategory("utilities")
    HEALTH = InitialCategory("health")
    ENTERTAINMENT = InitialCategory("entertainment")
    EDUCATION = InitialCategory("education")
    OTHER = InitialCategory("other")

    def initial_ids(self, user=1):
        """The ids of the User's initial Categories, in catalog order."""
        listed = self.call("GET", "/api/categories", user=user).json()["results"]
        return [item["id"] for item in listed if item["key"]]

    def initial_category(self, key, user=1):
        listed = self.call("GET", "/api/categories", user=user).json()["results"]
        return next(item["id"] for item in listed if item["key"] == key)

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

    def register(self, account, user=1, **fields):
        category_id = self.initial_category("food", user=user)
        body = {"amount": "12.50", "category_id": category_id, "account_id": account["id"], **fields}
        return self.call("POST", "/api/expenses", body, user=user)

    def registered(self, account, user=1, **fields):
        response = self.register(account, user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def assert_rejected(self, response, field):
        self.assertEqual(response.status_code, 400, response.content)
        errors = response.json()["errors"]
        self.assertEqual(list(errors), [field])
        self.assertTrue(errors[field][0])


class PanamaClockTests(ExpenseApiTestCase):
    """The real clock, not the pinned one: 02:00 UTC is still the evening before in Panama."""

    def setUp(self):
        # Skips the pinned clock of the base class on purpose.
        instant = datetime.datetime(2026, 11, 17, 2, 0, tzinfo=datetime.timezone.utc)
        patcher = mock.patch("django.utils.timezone.now", return_value=instant)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_the_date_starts_as_the_day_it_is_in_panama_not_in_utc(self):
        account = self.account(opening_date="2026-11-01")

        created = self.registered(account)

        self.assertEqual(created["date"], "2026-11-16")

    def test_the_day_that_has_not_started_in_panama_is_in_the_future(self):
        account = self.account(opening_date="2026-11-01")

        self.assert_rejected(self.register(account, date="2026-11-17"), "date")
        self.assertEqual(self.registered(account, date="2026-11-16")["date"], "2026-11-16")


class RegisterExpenseTests(ExpenseApiTestCase):
    def test_a_registered_expense_lowers_the_balance_of_its_account(self):
        account = self.account()

        response = self.register(account, amount="12.50", description="  Supermercado ")

        self.assertEqual(response.status_code, 201, response.content)
        created = response.json()
        self.assertEqual(
            created,
            {
                "id": created["id"],
                "amount": "12.50",
                "category_id": self.FOOD,
                "account_id": account["id"],
                "date": "2026-11-16",
                "description": "Supermercado",
                "recurring_payment_occurrence_id": None,
            },
        )
        self.assertEqual(self.balance(account), "987.50")

    def test_the_date_starts_as_today_and_the_description_is_optional(self):
        account = self.account()

        created = self.registered(account)

        self.assertEqual(created["date"], "2026-11-16")
        self.assertEqual(created["description"], "")

    def test_an_expense_needs_no_budget(self):
        # Budgets arrive with another ticket; a Category without one still takes Expenses.
        account = self.account()

        for category in (self.HOUSING, self.OTHER):
            self.registered(account, category_id=category)

        self.assertEqual(self.balance(account), "975.00")

    def test_a_balance_that_turns_negative_is_accepted(self):
        account = self.account(opening_balance="10.00")

        self.registered(account, amount="25.00")

        self.assertEqual(self.balance(account), "-15.00")

    def test_the_balance_keeps_exact_cents(self):
        account = self.account(opening_balance="0.30")

        for _ in range(3):
            self.registered(account, amount="0.10")

        # Binary floating point would leave 5.5e-17.
        self.assertEqual(self.balance(account), "0.00")

    def test_a_savings_account_takes_expenses(self):
        account = self.account(type="savings", opening_balance="500.00")

        self.registered(account, amount="40.00")

        self.assertEqual(self.balance(account), "460.00")

    def test_an_account_with_expenses_is_marked_as_having_records(self):
        account = self.account()
        self.registered(account)

        listed = self.call("GET", "/api/accounts").json()["results"][0]

        self.assertTrue(listed["has_records"])

    def test_an_account_with_expenses_is_archived_instead_of_deleted(self):
        account = self.account()
        self.registered(account, amount="100.00")

        self.archive(account)

        self.assertEqual(self.balance(account), "900.00")


class ExpenseValidationTests(ExpenseApiTestCase):
    def test_requires_an_amount_a_category_and_an_account(self):
        response = self.call("POST", "/api/expenses", {})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(sorted(response.json()["errors"]), ["account_id", "amount", "category_id"])

    def test_rejects_an_amount_that_is_not_positive_or_not_exact_cents(self):
        account = self.account()

        for amount in ("0", "0.00", "-5.00", "10.005", "abc", "", "1e3", "NaN", 12.5, 12, None):
            with self.subTest(amount=amount):
                self.assert_rejected(self.register(account, amount=amount), "amount")

        self.assertEqual(self.balance(account), "1000.00")

    def test_an_amount_past_twelve_digits_says_it_is_too_large_and_not_that_it_is_not_positive(self):
        account = self.account()

        for amount in ("1000000000000.00", "1234567890123456", "1000000000000.123"):
            with self.subTest(amount=amount):
                response = self.register(account, amount=amount)
                self.assert_rejected(response, "amount")
                self.assertIn("demasiado grande", response.json()["errors"]["amount"][0])

        self.assertEqual(self.balance(account), "1000.00")

    def test_too_many_decimals_are_not_called_too_large(self):
        account = self.account()

        response = self.register(account, amount="10.1234567890123")

        self.assert_rejected(response, "amount")
        self.assertNotIn("demasiado grande", response.json()["errors"]["amount"][0])

    def test_accepts_the_smallest_amount_and_a_large_one(self):
        account = self.account(opening_balance="0.00")

        self.registered(account, amount="0.01")
        self.registered(account, amount="999999999999.99")

        self.assertEqual(self.balance(account), "-1000000000000.00")

    def test_rejects_a_category_that_is_not_a_category_id(self):
        account = self.account()

        for category in ("2", 2.0, True, None, "Alimentación"):
            with self.subTest(category=category):
                self.assert_rejected(self.register(account, category_id=category), "category_id")

    def test_a_category_of_another_user_or_unknown_answers_not_found(self):
        account = self.account()
        theirs = self.initial_category("food", user=2)

        for category in (theirs, 0, 99999, -1):
            with self.subTest(category=category):
                response = self.register(account, category_id=category)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json(), {"detail": "not_found"})
        self.assertEqual(self.call("GET", "/api/expenses").json()["total"], 0)

    def test_accepts_each_of_the_eight_categories(self):
        account = self.account()

        for category in self.initial_ids():
            self.registered(account, category_id=category)

        self.assertEqual(self.balance(account), "900.00")

    def test_rejects_a_date_in_the_future(self):
        account = self.account()

        self.assert_rejected(self.register(account, date="2026-11-17"), "date")

    def test_rejects_a_date_before_the_account_started(self):
        account = self.account(opening_date="2026-11-10")

        response = self.register(account, date="2026-11-09")

        self.assert_rejected(response, "date")
        self.assertIn("(10 nov 2026)", response.json()["errors"]["date"][0])
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
                self.assertEqual(response.json()["errors"]["description"], ["La descripción debe ser texto."])

    def test_rejects_an_investment_account(self):
        broker = self.account(type="investment")

        self.assert_rejected(self.register(broker), "account_id")
        self.assertEqual(self.balance(broker), "1000.00")

    def test_rejects_an_archived_account(self):
        archived = self.account()
        self.registered(archived)
        self.archive(archived)

        self.assert_rejected(self.register(archived), "account_id")
        self.assertEqual(self.balance(archived), "987.50")

    def test_rejects_an_account_id_that_is_not_an_integer(self):
        account = self.account()

        for value in ("abc", 1.5, True, None):
            with self.subTest(value=value):
                self.assert_rejected(self.register(account, account_id=value), "account_id")

    def test_rejects_a_body_that_is_not_json(self):
        response = self.client.generic(
            "POST",
            "/api/expenses",
            data="{not json",
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"},
        )

        self.assert_rejected(response, "form")


class ExpenseIsolationTests(ExpenseApiTestCase):
    def test_an_account_of_another_user_answers_not_found_and_changes_nothing(self):
        theirs = self.account(user=2)

        response = self.register(theirs, user=1)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "not_found"})
        self.assertEqual(self.balance(theirs, user=2), "1000.00")
        self.assertEqual(self.call("GET", "/api/expenses", user=2).json()["total"], 0)

    def test_an_account_that_does_not_exist_answers_not_found(self):
        account = self.account()

        response = self.register(account, account_id=999999)

        self.assertEqual(response.status_code, 404)

    def test_not_found_wins_over_the_validation_of_the_other_fields(self):
        theirs = self.account(user=2)
        mine = self.account(user=1)
        expense = self.registered(mine)

        registering = self.register(theirs, user=1, amount="0", category_id=99, date="2999-01-01")
        correcting = self.call(
            "PUT",
            f"/api/expenses/{expense['id']}",
            {"amount": "0", "category_id": 99, "account_id": theirs["id"], "date": "2999-01-01"},
        )
        unknown_expense = self.call(
            "PUT",
            "/api/expenses/999999",
            {"amount": "0", "category_id": 99, "account_id": mine["id"]},
        )

        self.assertEqual(
            [registering.status_code, correcting.status_code, unknown_expense.status_code],
            [404, 404, 404],
        )

    def test_the_owner_comes_from_webapp_and_never_from_the_body(self):
        account = self.account(user=1)

        self.registered(account, user=1, user_id=2)

        self.assertEqual(self.call("GET", "/api/expenses", user=1).json()["total"], 1)
        self.assertEqual(self.call("GET", "/api/expenses", user=2).json()["total"], 0)


class ListExpensesTests(ExpenseApiTestCase):
    def page(self, query="", user=1):
        return self.call("GET", "/api/expenses" + query, user=user)

    def test_lists_the_newest_date_first_and_the_latest_registered_first_within_a_day(self):
        account = self.account(opening_date="2026-01-01")
        old = self.registered(account, date="2026-11-01")
        first_today = self.registered(account, date="2026-11-16")
        later_today = self.registered(account, date="2026-11-16")
        backdated = self.registered(account, date="2026-11-10")

        body = self.page().json()

        self.assertEqual(
            [expense["id"] for expense in body["results"]],
            [later_today["id"], first_today["id"], backdated["id"], old["id"]],
        )

    def test_returns_fifty_expenses_and_the_total_by_default(self):
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
            {
                "results": [],
                "total": 0,
                "page": 1,
                "page_size": 50,
                "next_page": None,
                "last_used_account_id": None,
            },
        )

    def test_a_user_sees_only_their_own_expenses(self):
        mine = self.registered(self.account(user=1), user=1)
        self.registered(self.account(user=2), user=2)

        listed = self.page(user=1).json()

        self.assertEqual([expense["id"] for expense in listed["results"]], [mine["id"]])
        self.assertEqual(listed["total"], 1)


class LastUsedAccountTests(ExpenseApiTestCase):
    def last_used(self, user=1):
        return self.call("GET", "/api/expenses", user=user).json()["last_used_account_id"]

    def test_is_the_account_of_the_expense_registered_last(self):
        first = self.account(name="Primera")
        second = self.account(name="Segunda")

        self.registered(first)
        self.assertEqual(self.last_used(), first["id"])
        self.registered(second)
        self.assertEqual(self.last_used(), second["id"])

    def test_follows_the_order_of_registration_and_not_the_date_of_the_expense(self):
        first = self.account(name="Primera", opening_date="2026-01-01")
        second = self.account(name="Segunda", opening_date="2026-01-01")
        self.registered(first, date="2026-11-16")

        self.registered(second, date="2026-03-01")

        self.assertEqual(self.last_used(), second["id"])

    def test_is_the_same_on_every_page(self):
        account = self.account()
        for _ in range(3):
            self.registered(account)

        page = self.call("GET", "/api/expenses?page_size=2&page=2").json()

        self.assertEqual(page["last_used_account_id"], account["id"])

    def test_never_comes_from_another_user(self):
        self.registered(self.account(user=2), user=2)

        self.assertIsNone(self.last_used(user=1))

    def test_falls_back_to_null_once_the_last_expense_is_deleted(self):
        account = self.account()
        expense = self.registered(account)
        self.call("DELETE", f"/api/expenses/{expense['id']}")

        self.assertIsNone(self.last_used())


class ReadExpenseTests(ExpenseApiTestCase):
    def test_returns_one_expense(self):
        account = self.account()
        created = self.registered(account, description="Taxi")

        response = self.call("GET", f"/api/expenses/{created['id']}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), created)

    def test_an_expense_of_another_user_or_unknown_answers_not_found(self):
        theirs = self.registered(self.account(user=2), user=2)

        for expense_id in (theirs["id"], 999999):
            with self.subTest(expense_id=expense_id):
                response = self.call("GET", f"/api/expenses/{expense_id}", user=1)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json(), {"detail": "not_found"})


class EditExpenseTests(ExpenseApiTestCase):
    def put(self, expense, user=1, **fields):
        body = {
            "amount": expense["amount"],
            "category_id": expense["category_id"],
            "account_id": expense["account_id"],
            "date": expense["date"],
            "description": expense["description"],
            **fields,
        }
        return self.call("PUT", f"/api/expenses/{expense['id']}", body, user=user)

    def test_correcting_the_amount_recalculates_the_balance(self):
        account = self.account()
        expense = self.registered(account, amount="100.00")
        self.assertEqual(self.balance(account), "900.00")

        response = self.put(expense, amount="40.25")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {**expense, "amount": "40.25"})
        self.assertEqual(self.balance(account), "959.75")

    def test_correcting_the_category_the_date_and_the_description(self):
        account = self.account(opening_date="2026-01-01")
        expense = self.registered(account)

        response = self.put(expense, category_id=self.HEALTH, date="2026-10-02", description="Farmacia")

        self.assertEqual(
            response.json(),
            {**expense, "category_id": self.HEALTH, "date": "2026-10-02", "description": "Farmacia"},
        )

    def test_changing_the_account_moves_the_effect_and_updates_both_balances(self):
        source = self.account(name="Origen", opening_balance="1000.00")
        target = self.account(name="Destino", opening_balance="300.00")
        expense = self.registered(source, amount="100.00")
        self.assertEqual((self.balance(source), self.balance(target)), ("900.00", "300.00"))

        response = self.put(expense, account_id=target["id"])

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["account_id"], target["id"])
        self.assertEqual((self.balance(source), self.balance(target)), ("1000.00", "200.00"))

    def test_an_edit_may_leave_the_balance_negative(self):
        account = self.account(opening_balance="50.00")
        expense = self.registered(account, amount="10.00")

        self.put(expense, amount="80.00")

        self.assertEqual(self.balance(account), "-30.00")

    def test_rejects_moving_the_expense_into_an_investment_or_archived_account(self):
        account = self.account()
        broker = self.account(type="investment")
        archived = self.account(name="Vieja")
        self.registered(archived)
        self.archive(archived)
        expense = self.registered(account, amount="100.00")

        for target in (broker, archived):
            with self.subTest(account=target["name"]):
                self.assert_rejected(self.put(expense, account_id=target["id"]), "account_id")

        self.assertEqual(self.balance(account), "900.00")
        self.assertEqual(self.balance(broker), "1000.00")

    def test_an_expense_on_an_account_archived_since_can_still_be_corrected(self):
        account = self.account()
        expense = self.registered(account, amount="100.00")
        self.archive(account)

        response = self.put(expense, amount="60.00", description="Corregido")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.balance(account), "940.00")

    def test_applies_the_date_rules_of_a_new_expense(self):
        account = self.account(opening_date="2026-11-10")
        other = self.account(name="Otra", opening_date="2026-11-14")
        expense = self.registered(account, date="2026-11-11")

        self.assert_rejected(self.put(expense, date="2026-11-17"), "date")
        self.assert_rejected(self.put(expense, date="2026-11-09"), "date")
        # The date must also follow the Account the Expense moves to.
        self.assert_rejected(self.put(expense, account_id=other["id"]), "date")
        self.assertEqual(self.put(expense, date="2026-11-10").status_code, 200)

    def test_requires_the_same_fields_as_registering(self):
        expense = self.registered(self.account())

        response = self.call("PUT", f"/api/expenses/{expense['id']}", {})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(sorted(response.json()["errors"]), ["account_id", "amount", "category_id"])

    def test_requires_the_date_instead_of_assuming_today(self):
        account = self.account(opening_date="2026-01-01")
        expense = self.registered(account, date="2026-10-01")
        body = {key: expense[key] for key in ("amount", "category_id", "account_id")}

        response = self.call("PUT", f"/api/expenses/{expense['id']}", body)

        self.assert_rejected(response, "date")
        self.assertEqual(self.call("GET", f"/api/expenses/{expense['id']}").json()["date"], "2026-10-01")

    def test_rejects_an_invalid_amount_or_category_without_changing_anything(self):
        account = self.account()
        expense = self.registered(account, amount="100.00")

        self.assert_rejected(self.put(expense, amount="0"), "amount")
        self.assertEqual(self.put(expense, category_id=99999).status_code, 404)

        self.assertEqual(self.call("GET", f"/api/expenses/{expense['id']}").json(), expense)
        self.assertEqual(self.balance(account), "900.00")

    def test_the_expense_of_another_user_answers_not_found_and_stays_unchanged(self):
        theirs_account = self.account(user=2)
        theirs = self.registered(theirs_account, user=2, amount="100.00")

        response = self.put(theirs, user=1, amount="1.00")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balance(theirs_account, user=2), "900.00")

    def test_moving_to_an_account_of_another_user_answers_not_found_and_changes_no_balance(self):
        mine = self.account(user=1)
        theirs = self.account(user=2)
        expense = self.registered(mine, amount="100.00")

        response = self.put(expense, account_id=theirs["id"])

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balance(mine), "900.00")
        self.assertEqual(self.balance(theirs, user=2), "1000.00")
        self.assertEqual(self.call("GET", f"/api/expenses/{expense['id']}").json(), expense)


class DeleteExpenseTests(ExpenseApiTestCase):
    def delete(self, expense, user=1):
        return self.call("DELETE", f"/api/expenses/{expense['id']}", user=user)

    def test_deleting_an_expense_restores_the_balance(self):
        account = self.account()
        kept = self.registered(account, amount="10.00")
        removed = self.registered(account, amount="100.00")
        self.assertEqual(self.balance(account), "890.00")

        response = self.delete(removed)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.balance(account), "990.00")
        listed = self.call("GET", "/api/expenses").json()
        self.assertEqual([expense["id"] for expense in listed["results"]], [kept["id"]])
        self.assertEqual(self.call("GET", f"/api/expenses/{removed['id']}").status_code, 404)

    def test_deleting_an_expense_leaves_the_balance_of_other_accounts_alone(self):
        source = self.account(name="Origen", opening_balance="1000.00")
        other = self.account(name="Otra", opening_balance="300.00")
        removed = self.registered(source, amount="100.00")
        self.registered(other, amount="40.00")

        self.delete(removed)

        self.assertEqual((self.balance(source), self.balance(other)), ("1000.00", "260.00"))

    def test_an_account_without_expenses_left_can_be_deleted_again(self):
        account = self.account()
        expense = self.registered(account)
        self.delete(expense)

        response = self.call("DELETE", f"/api/accounts/{account['id']}")

        self.assertEqual(response.status_code, 204)

    def test_an_expense_on_an_archived_account_can_be_deleted(self):
        account = self.account()
        expense = self.registered(account, amount="100.00")
        self.archive(account)

        self.assertEqual(self.delete(expense).status_code, 204)
        self.assertEqual(self.balance(account), "1000.00")

    def test_the_expense_of_another_user_answers_not_found_and_stays(self):
        theirs_account = self.account(user=2)
        theirs = self.registered(theirs_account, user=2, amount="100.00")

        response = self.delete(theirs, user=1)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balance(theirs_account, user=2), "900.00")
        self.assertEqual(self.call("GET", "/api/expenses", user=2).json()["total"], 1)

    def test_deleting_twice_answers_not_found_the_second_time(self):
        expense = self.registered(self.account())
        self.delete(expense)

        self.assertEqual(self.delete(expense).status_code, 404)
