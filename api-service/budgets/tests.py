import json
import threading
from unittest import mock

from django.db import connection
from django.test import Client, TransactionTestCase, override_settings, tag

from expenses.tests import TODAY
from recurring_payments import tests as recurring_tests
from recurring_payments.tests import FOOD, RULES, UTILITIES

BUDGETS = "/api/budgets"


class BudgetApiTestCase(recurring_tests.RecurringPaymentApiTestCase):
    def create_budget(self, user=1, **fields):
        body = {"amount": "300.00", "category_id": FOOD, "month": "2026-11", **fields}
        return self.call("POST", BUDGETS, body, user=user)

    def budget(self, user=1, **fields):
        response = self.create_budget(user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def month(self, month="2026-11", user=1):
        response = self.call("GET", f"{BUDGETS}?month={month}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return {row["category_id"]: row for row in response.json()["results"]}

    def row(self, category_id, month="2026-11", user=1):
        return self.month(month, user)[category_id]


class BudgetCrudTests(BudgetApiTestCase):
    def test_creates_a_budget_with_its_remaining(self):
        created = self.budget()

        self.assertEqual(
            created,
            {
                "id": created["id"],
                "category_id": FOOD,
                "month": "2026-11",
                "amount": "300.00",
                "spent": "0.00",
                "committed": "0.00",
                "carried_over": "0.00",
                "remaining": "300.00",
                "exceeded": False,
            },
        )

    def test_reads_one_budget(self):
        created = self.budget()
        self.registered(self.account(), amount="40.00")

        response = self.call("GET", f"{BUDGETS}/{created['id']}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["remaining"], "260.00")

    def test_edits_the_amount_and_deletes_a_budget(self):
        created = self.budget()
        body = {"amount": "450.50", "category_id": FOOD, "month": "2026-11"}

        edited = self.call("PUT", f"{BUDGETS}/{created['id']}", body)
        self.assertEqual(edited.status_code, 200, edited.content)
        self.assertEqual(edited.json()["remaining"], "450.50")

        self.assertEqual(self.call("DELETE", f"{BUDGETS}/{created['id']}").status_code, 204)
        self.assertEqual(self.call("GET", f"{BUDGETS}/{created['id']}").status_code, 404)
        self.assertIsNone(self.row(FOOD)["id"])

    def test_only_one_budget_per_category_and_month(self):
        self.budget()

        duplicate = self.create_budget(amount="10.00")

        self.assertEqual(duplicate.status_code, 409, duplicate.content)
        self.assertEqual(list(duplicate.json()["errors"]), ["form"])
        self.assertEqual(self.row(FOOD)["amount"], "300.00")

    def test_the_same_category_may_have_a_budget_in_another_month_and_for_another_user(self):
        self.budget()

        self.assertEqual(self.create_budget(month="2026-10").status_code, 201)
        self.assertEqual(self.create_budget(user=2).status_code, 201)

    def test_moving_a_budget_onto_an_occupied_month_conflicts(self):
        self.budget()
        october = self.budget(month="2026-10")
        body = {"amount": "300.00", "category_id": FOOD, "month": "2026-11"}

        response = self.call("PUT", f"{BUDGETS}/{october['id']}", body)

        self.assertEqual(response.status_code, 409, response.content)

    def test_another_users_budget_is_as_absent_as_an_unknown_one(self):
        theirs = self.budget(user=2)
        body = {"amount": "1.00", "category_id": FOOD, "month": "2026-11"}

        for method, data in (("GET", None), ("PUT", body), ("DELETE", None)):
            response = self.call(method, f"{BUDGETS}/{theirs['id']}", data)
            self.assertEqual(response.status_code, 404, method)
        self.assertEqual(self.row(FOOD, user=2)["amount"], "300.00")

    def test_rejects_invalid_fields(self):
        cases = {
            "amount": [{"amount": "0"}, {"amount": "-5.00"}, {"amount": 300}, {"amount": "1.234"}],
            "category_id": [{"category_id": 99}, {"category_id": "2"}, {"category_id": None}],
            "month": [{"month": "2026-13"}, {"month": "2026-11-01"}, {"month": "0000-01"}],
        }
        for field, bodies in cases.items():
            for override in bodies:
                with self.subTest(override):
                    self.assert_rejected(self.create_budget(**override), field)

    def test_rejects_a_missing_field(self):
        for field in ("amount", "category_id", "month"):
            body = {"amount": "300.00", "category_id": FOOD, "month": "2026-11"}
            del body[field]
            with self.subTest(field):
                self.assert_rejected(self.call("POST", BUDGETS, body), field)


class MonthlyListTests(BudgetApiTestCase):
    def test_lists_every_category_for_the_current_month_by_default(self):
        self.budget()

        response = self.call("GET", BUDGETS)

        body = response.json()
        self.assertEqual(body["month"], "2026-11")
        self.assertEqual([row["category_id"] for row in body["results"]], list(range(1, 9)))
        self.assertEqual(body["results"][FOOD - 1]["amount"], "300.00")

    def test_rejects_an_invalid_month(self):
        for month in ("2026-13", "november", "2026-1", ""):
            with self.subTest(month):
                self.assert_rejected(self.call("GET", f"{BUDGETS}?month={month}"), "month")

    def test_budgets_of_other_months_and_users_stay_out(self):
        self.budget(month="2026-09")
        self.budget(user=2)

        self.assertIsNone(self.row(FOOD)["amount"])


class RemainingTests(BudgetApiTestCase):
    def test_subtracts_the_months_expenses_of_the_category(self):
        account = self.account(opening_date="2026-10-01")
        self.budget()
        self.registered(account, amount="50.00", date="2026-11-03")
        self.registered(account, amount="25.25", date="2026-11-16")
        self.registered(account, amount="99.00", date="2026-10-31")
        self.registered(account, amount="70.00", category_id=UTILITIES)

        row = self.row(FOOD)

        self.assertEqual((row["spent"], row["remaining"]), ("75.25", "224.75"))
        self.assertFalse(row["exceeded"])

    def test_an_expense_that_exceeds_the_budget_is_accepted_and_flags_the_category(self):
        account = self.account()
        self.budget(amount="100.00")

        response = self.register(account, amount="130.00")

        self.assertEqual(response.status_code, 201, response.content)
        row = self.row(FOOD)
        self.assertEqual((row["remaining"], row["exceeded"]), ("-30.00", True))

    def test_a_category_without_budget_shows_spent_and_no_remaining(self):
        self.registered(self.account(), amount="40.00")

        row = self.row(FOOD)

        self.assertEqual(
            (row["id"], row["amount"], row["spent"], row["remaining"], row["exceeded"]),
            (None, None, "40.00", None, False),
        )

    def test_an_expense_without_a_budget_is_accepted(self):
        response = self.register(self.account(), amount="5.00")

        self.assertEqual(response.status_code, 201, response.content)

    def test_another_users_expenses_do_not_count(self):
        self.budget()
        self.registered(self.account(user=2), user=2, amount="80.00")

        self.assertEqual(self.row(FOOD)["remaining"], "300.00")

    def test_a_reservation_is_subtracted_until_it_is_resolved(self):
        account = self.account()
        self.budget(category_id=UTILITIES)
        occurrence = self.pending_occurrence(account)

        reserved = self.row(UTILITIES)
        self.assertEqual(
            (reserved["committed"], reserved["spent"], reserved["remaining"]),
            ("100.00", "0.00", "200.00"),
        )

        self.assertEqual(self.confirm(occurrence, {"amount": "120.00"}).status_code, 200)
        confirmed = self.row(UTILITIES)
        self.assertEqual(
            (confirmed["committed"], confirmed["spent"], confirmed["remaining"]),
            ("0.00", "120.00", "180.00"),
        )

    def test_cancelling_a_reservation_gives_the_budget_back(self):
        self.budget(category_id=UTILITIES)
        occurrence = self.pending_occurrence(self.account())

        self.assertEqual(self.cancel(occurrence).status_code, 200)

        row = self.row(UTILITIES)
        self.assertEqual((row["committed"], row["spent"], row["remaining"]), ("0.00", "0.00", "300.00"))

    def test_a_savings_account_payment_still_reduces_its_category(self):
        savings = self.account(type="savings")
        self.budget(category_id=UTILITIES)
        self.pending_occurrence(savings)

        self.assertEqual(self.row(UTILITIES)["remaining"], "200.00")

    def test_a_reservation_without_budget_leaves_no_remaining(self):
        self.pending_occurrence(self.account())

        row = self.row(UTILITIES)

        self.assertEqual((row["committed"], row["remaining"]), ("100.00", None))

    def test_the_listing_reserves_what_is_due_before_any_recurring_screen_is_opened(self):
        account = self.account()
        self.budget(category_id=UTILITIES)
        self.rule(account)
        self.set_today("2026-12-02")
        self.budget(category_id=UTILITIES, month="2026-12")

        # Two reservations count in December: November's carried over, and December's.
        row = self.row(UTILITIES, month="2026-12")

        self.assertEqual((row["committed"], row["carried_over"]), ("200.00", "100.00"))
        self.assertEqual(row["remaining"], "100.00")

    def test_paying_last_months_reservation_this_month_keeps_each_cutoff(self):
        account = self.account()
        self.budget(category_id=UTILITIES)
        occurrence = self.pending_occurrence(account)
        rule = self.rules()[0]
        self.assertEqual(self.call("DELETE", f"{RULES}/{rule['id']}").status_code, 204)
        self.set_today("2026-12-05")
        self.budget(category_id=UTILITIES, month="2026-12")

        carried = self.row(UTILITIES, month="2026-12")
        self.assertEqual(
            (carried["committed"], carried["carried_over"], carried["remaining"]),
            ("100.00", "100.00", "200.00"),
        )

        paid = self.confirm(occurrence, {"amount": "120.00", "date": "2026-12-05"})
        self.assertEqual(paid.status_code, 200, paid.content)

        november = self.row(UTILITIES, month="2026-11")
        december = self.row(UTILITIES, month="2026-12")
        self.assertEqual(
            (november["spent"], november["committed"], november["remaining"]),
            ("0.00", "100.00", "200.00"),
        )
        self.assertEqual(
            (december["spent"], december["committed"], december["remaining"]),
            ("120.00", "0.00", "180.00"),
        )

    def test_a_past_month_ignores_reservations_that_entered_after_its_cutoff(self):
        self.budget(category_id=UTILITIES, month="2026-10")
        self.pending_occurrence(self.account())

        row = self.row(UTILITIES, month="2026-10")

        self.assertEqual((row["committed"], row["remaining"]), ("0.00", "300.00"))

    def test_past_budgets_can_be_listed_and_edited(self):
        created = self.budget(month="2026-09")
        body = {"amount": "500.00", "category_id": FOOD, "month": "2026-09"}

        edited = self.call("PUT", f"{BUDGETS}/{created['id']}", body)

        self.assertEqual(edited.status_code, 200, edited.content)
        self.assertEqual(self.row(FOOD, month="2026-09")["amount"], "500.00")


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ConcurrentBudgetTests(TransactionTestCase):
    """Simultaneous requests hit the database, so each one commits for real."""

    # The flush after each test would otherwise erase the Categories seeded by a migration.
    serialized_rollback = True

    def setUp(self):
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)

    def test_two_simultaneous_creates_for_one_category_and_month_leave_a_single_budget(self):
        start = threading.Barrier(2)
        statuses = []

        def create():
            try:
                start.wait()
                response = Client().generic(
                    "POST",
                    BUDGETS,
                    data=json.dumps({"amount": "300.00", "category_id": FOOD, "month": "2026-11"}),
                    content_type="application/json",
                    headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"},
                )
                statuses.append(response.status_code)
            finally:
                connection.close()

        threads = [threading.Thread(target=create) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(sorted(statuses), [201, 409])
