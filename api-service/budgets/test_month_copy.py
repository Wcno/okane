import json
import threading
from datetime import UTC, datetime
from unittest import mock

from django.db import connection
from django.utils import timezone
from django.test import Client, TransactionTestCase, override_settings, tag

from budgets.models import Budget, BudgetMonth
from budgets.tests import BUDGETS
from categories.tests import CategoryApiTestCase
from expenses.tests import TODAY
from recurring_payments.tests import FOOD, UTILITIES

AMOUNTS_BY_CATEGORY = {FOOD: "300.00", UTILITIES: "99999999999.99"}


class MonthCopyTests(CategoryApiTestCase):
    def previous_month_budgets(self, user=1):
        for category_id, amount in AMOUNTS_BY_CATEGORY.items():
            self.budget(user=user, category_id=category_id, month="2026-10", amount=amount)

    def amounts(self, month="2026-11", user=1):
        return {
            category_id: row["amount"]
            for category_id, row in self.month(month, user).items()
            if row["amount"] is not None
        }

    def test_first_access_to_the_current_month_copies_the_previous_amounts_exactly(self):
        self.previous_month_budgets()

        self.assertEqual(self.amounts(), AMOUNTS_BY_CATEGORY)
        self.assertTrue(BudgetMonth.objects.filter(user_id=1, month="2026-11-01").exists())

    def test_archived_categories_are_not_copied(self):
        category = self.category(name="Mascotas")
        self.budget(category_id=category["id"], month="2026-10")
        self.budget(category_id=FOOD, month="2026-10")
        self.archive_category(category)

        self.assertEqual(self.amounts(), {FOOD: "300.00"})

    def test_the_copies_are_independent_of_the_month_they_came_from(self):
        self.previous_month_budgets()
        copied = self.row(FOOD)

        edited = self.call(
            "PUT",
            f"{BUDGETS}/{copied['id']}",
            {"amount": "10.00", "category_id": FOOD, "month": "2026-11"},
        )

        self.assertEqual(edited.status_code, 200, edited.content)
        self.assertEqual(self.row(FOOD, month="2026-10")["amount"], "300.00")
        self.assertEqual(self.row(FOOD)["amount"], "10.00")

    def test_deleting_every_budget_of_the_month_does_not_copy_again(self):
        self.previous_month_budgets()
        for row in self.month().values():
            if row["id"]:
                self.assertEqual(self.call("DELETE", f"{BUDGETS}/{row['id']}").status_code, 204)

        self.assertEqual(self.amounts(), {})
        self.assertEqual(Budget.objects.filter(user_id=1, month="2026-11-01").count(), 0)

    def test_a_month_that_started_empty_stays_initialized(self):
        self.assertEqual(self.amounts(), {})
        self.assertTrue(BudgetMonth.objects.filter(user_id=1, month="2026-11-01").exists())

        self.previous_month_budgets()

        self.assertEqual(self.amounts(), {})

    def test_historical_months_are_not_filled_by_consulting_them(self):
        self.budget(month="2026-08")

        self.assertEqual(self.amounts(month="2026-09"), {})
        self.assertEqual(self.amounts(month="2026-10"), {})
        self.assertFalse(BudgetMonth.objects.filter(month__lt="2026-11-01").exists())

    def test_only_the_immediately_previous_calendar_month_is_copied(self):
        self.budget(month="2026-09")

        self.assertEqual(self.amounts(), {})

    def test_a_hand_made_budget_is_not_overwritten_and_blocks_the_copy(self):
        self.previous_month_budgets()

        created = self.create_budget(category_id=FOOD, amount="75.00")

        self.assertEqual(created.status_code, 201, created.content)
        self.assertEqual(self.amounts(), {FOOD: "75.00"})

    def test_a_personalized_month_is_marked_without_copying(self):
        self.budget(category_id=FOOD, amount="75.00")
        self.previous_month_budgets()

        self.assertEqual(self.amounts(), {FOOD: "75.00"})

    def test_repeated_reads_do_not_duplicate_or_restore_rows(self):
        self.previous_month_budgets()

        for _ in range(3):
            self.assertEqual(self.amounts(), AMOUNTS_BY_CATEGORY)

        self.assertEqual(Budget.objects.filter(user_id=1, month="2026-11-01").count(), 2)

    def test_each_user_copies_only_their_own_budgets(self):
        self.previous_month_budgets()

        self.assertEqual(self.amounts(user=2), {})
        self.assertEqual(self.amounts(user=1), AMOUNTS_BY_CATEGORY)

    def test_crossing_into_a_new_month_copies_the_month_that_just_ended(self):
        self.budget(category_id=FOOD, amount="120.00")
        self.set_today("2026-12-01")

        self.assertEqual(self.amounts(month="2026-12"), {FOOD: "120.00"})

    def test_the_new_year_copies_from_december(self):
        self.budget(category_id=FOOD, month="2026-12", amount="42.00")
        self.set_today("2027-01-01")

        self.assertEqual(self.amounts(month="2027-01"), {FOOD: "42.00"})

    def test_a_late_evening_in_panama_still_belongs_to_the_old_month(self):
        self.budget(category_id=FOOD, month="2026-10", amount="300.00")
        self.clock.side_effect = timezone.localdate
        # 2026-12-01 03:00 UTC is still the evening of 2026-11-30 in Panama.
        with mock.patch("django.utils.timezone.now", return_value=datetime(2026, 12, 1, 3, tzinfo=UTC)):
            self.assertEqual(self.amounts(), {FOOD: "300.00"})
            self.assertEqual(self.amounts(month="2026-12"), {})


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ConcurrentMonthCopyTests(TransactionTestCase):
    """Simultaneous first accesses hit the database, so each one commits for real."""

    serialized_rollback = True

    def setUp(self):
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)

    def request(self, method, path, body=None):
        return Client().generic(
            method,
            path,
            data=json.dumps(body) if body else "",
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"},
        )

    def test_two_simultaneous_first_accesses_leave_a_single_copy(self):
        created = self.request(
            "POST", BUDGETS, {"amount": "300.00", "category_id": FOOD, "month": "2026-10"}
        )
        self.assertEqual(created.status_code, 201, created.content)
        start = threading.Barrier(2)
        statuses = []

        def read():
            try:
                start.wait()
                statuses.append(self.request("GET", f"{BUDGETS}?month=2026-11").status_code)
            finally:
                connection.close()

        threads = [threading.Thread(target=read) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(statuses, [200, 200])
        self.assertEqual(Budget.objects.filter(user_id=1, month="2026-11-01").count(), 1)
        self.assertEqual(BudgetMonth.objects.filter(user_id=1, month="2026-11-01").count(), 1)
