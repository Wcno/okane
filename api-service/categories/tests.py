from budgets.tests import BudgetApiTestCase, BUDGETS
from categories.models import Category
from recurring_payments.models import RecurringPaymentOccurrence

CATEGORIES = "/api/categories"
HOUSING, OTHER = 1, 8
INITIAL_NAMES = [
    "Vivienda",
    "Alimentación",
    "Transporte",
    "Servicios",
    "Salud",
    "Entretenimiento",
    "Educación",
    "Otros",
]


class CategoryApiTestCase(BudgetApiTestCase):
    def create_category(self, user=1, name="Mascotas"):
        return self.call("POST", CATEGORIES, {"name": name}, user=user)

    def category(self, user=1, **fields):
        response = self.create_category(user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def archive_category(self, category, user=1):
        return self.call("POST", f"{CATEGORIES}/{category['id']}/archive", user=user)

    def listed(self, user=1):
        response = self.call("GET", CATEGORIES, user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]


class InitialCatalogTests(CategoryApiTestCase):
    def test_a_new_user_gets_the_initial_catalog_with_stable_ids(self):
        listed = self.listed(user=77)

        self.assertEqual([item["id"] for item in listed], list(range(1, 9)))
        self.assertEqual([item["name"] for item in listed], INITIAL_NAMES)
        self.assertTrue(all(not item["is_custom"] for item in listed))
        self.assertTrue(all(item["archived_at"] is None for item in listed))

    def test_existing_expenses_and_budgets_keep_their_category(self):
        account = self.account()
        expense = self.registered(account, category_id=HOUSING)
        budget = self.budget(category_id=HOUSING)

        self.assertEqual(expense["category_id"], HOUSING)
        self.assertEqual(budget["category_id"], HOUSING)
        self.assertEqual(Category.objects.get(pk=HOUSING).name, "Vivienda")

    def test_the_initial_catalog_cannot_be_renamed_or_archived(self):
        renamed = self.call("PUT", f"{CATEGORIES}/{HOUSING}", {"name": "Casa"})
        archived = self.call("POST", f"{CATEGORIES}/{HOUSING}/archive")

        self.assertEqual(renamed.status_code, 409)
        self.assertEqual(archived.status_code, 409)
        self.assertEqual(self.listed()[0]["name"], "Vivienda")


class OwnCategoryTests(CategoryApiTestCase):
    def test_creates_renames_and_reads_a_category(self):
        created = self.category()
        self.assertEqual(
            created,
            {"id": created["id"], "name": "Mascotas", "is_custom": True, "archived_at": None},
        )
        self.assertGreater(created["id"], OTHER)

        renamed = self.call("PUT", f"{CATEGORIES}/{created['id']}", {"name": "  Mis   mascotas "})
        read = self.call("GET", f"{CATEGORIES}/{created['id']}")

        self.assertEqual(renamed.status_code, 200, renamed.content)
        self.assertEqual(read.json()["name"], "Mis mascotas")

    def test_rejects_an_invalid_or_taken_name(self):
        self.category()

        for name in ("", "   ", None, 5, "x" * 41, "mascotas", "vivienda"):
            with self.subTest(name=name):
                self.assert_rejected(self.create_category(name=name), "name")

    def test_a_name_may_repeat_across_users_and_after_archiving(self):
        first = self.category()

        self.assertEqual(self.create_category(user=2).status_code, 201)
        self.assertEqual(self.archive_category(first).status_code, 200)
        self.assertEqual(self.create_category().status_code, 201)

    def test_another_users_category_is_absent(self):
        mine = self.category()

        self.assertEqual(self.call("GET", f"{CATEGORIES}/{mine['id']}", user=2).status_code, 404)
        self.assertEqual(
            self.call("PUT", f"{CATEGORIES}/{mine['id']}", {"name": "X"}, user=2).status_code, 404
        )
        self.assertEqual(self.archive_category(mine, user=2).status_code, 404)
        self.assertNotIn(mine["id"], [item["id"] for item in self.listed(user=2)])

    def test_archiving_keeps_the_category_in_the_list_marked_as_archived(self):
        mine = self.category()

        archived = self.archive_category(mine)

        self.assertEqual(archived.status_code, 200, archived.content)
        self.assertIsNotNone(archived.json()["archived_at"])
        self.assertIsNotNone(
            next(item for item in self.listed() if item["id"] == mine["id"])["archived_at"]
        )
        self.assertEqual(self.archive_category(mine).status_code, 200)


class ArchivedCategoryTests(CategoryApiTestCase):
    def test_an_archived_category_is_refused_for_new_expenses_budgets_and_rules(self):
        account = self.account()
        mine = self.category()
        self.archive_category(mine)

        self.assert_rejected(self.register(account, category_id=mine["id"]), "category_id")
        self.assert_rejected(self.create_budget(category_id=mine["id"]), "category_id")
        self.assert_rejected(self.create_rule(account, category_id=mine["id"]), "category_id")

    def test_another_users_category_is_refused_on_new_records(self):
        account = self.account()
        theirs = self.category(user=2)

        self.assert_rejected(self.register(account, category_id=theirs["id"]), "category_id")
        self.assert_rejected(self.create_budget(category_id=theirs["id"]), "category_id")

    def test_past_expenses_and_budgets_stay_visible_and_correctable(self):
        account = self.account()
        mine = self.category()
        expense = self.registered(account, category_id=mine["id"], amount="25.00")
        budget = self.budget(category_id=mine["id"])
        self.archive_category(mine)

        row = self.row(mine["id"])
        corrected = self.call(
            "PUT",
            f"/api/expenses/{expense['id']}",
            {
                "amount": "30.00",
                "category_id": mine["id"],
                "account_id": account["id"],
                "date": expense["date"],
            },
        )
        budget_edit = self.call(
            "PUT",
            f"{BUDGETS}/{budget['id']}",
            {"amount": "400.00", "category_id": mine["id"], "month": "2026-11"},
        )

        self.assertEqual(row["id"], budget["id"])
        self.assertEqual(row["spent"], "25.00")
        self.assertEqual(corrected.status_code, 200, corrected.content)
        self.assertEqual(budget_edit.status_code, 200, budget_edit.content)

    def test_moving_an_expense_into_an_archived_category_is_refused(self):
        account = self.account()
        mine = self.category()
        self.archive_category(mine)
        expense = self.registered(account, category_id=HOUSING)

        moved = self.call(
            "PUT",
            f"/api/expenses/{expense['id']}",
            {
                "amount": "10.00",
                "category_id": mine["id"],
                "account_id": account["id"],
                "date": expense["date"],
            },
        )

        self.assert_rejected(moved, "category_id")

    def test_an_archived_category_without_history_leaves_the_month(self):
        mine = self.category()
        self.archive_category(mine)

        self.assertNotIn(mine["id"], self.month())


class ArchiveBlockersTests(CategoryApiTestCase):
    def test_a_category_with_recurring_payments_must_be_cleared_first(self):
        account = self.account()
        mine = self.category()
        rule = self.rule(account, category_id=mine["id"])

        blocked = self.archive_category(mine)

        self.assertEqual(blocked.status_code, 409)
        self.assertIn("pagos recurrentes", blocked.json()["errors"]["form"][0])
        self.assertIsNone(self.call("GET", f"{CATEGORIES}/{mine['id']}").json()["archived_at"])

        self.call("DELETE", f"/api/recurring-payments/{rule['id']}")

        self.assertEqual(self.archive_category(mine).status_code, 409)
        self.cancel(rule["occurrences"][0])
        self.assertEqual(self.archive_category(mine).status_code, 200)

    def test_pending_reservations_must_be_resolved_before_archiving(self):
        account = self.account()
        mine = self.category()
        occurrence = self.pending_occurrence(account, category_id=mine["id"])
        rule_id = occurrence["recurring_payment_id"]
        self.call("DELETE", f"/api/recurring-payments/{rule_id}")

        blocked = self.archive_category(mine)

        self.assertEqual(blocked.status_code, 409)
        self.assertIn("pendientes", blocked.json()["errors"]["form"][0])

    def test_historical_occurrences_keep_their_category(self):
        account = self.account()
        mine = self.category()
        occurrence = self.pending_occurrence(account, category_id=mine["id"])
        self.cancel(occurrence)
        self.call("DELETE", f"/api/recurring-payments/{occurrence['recurring_payment_id']}")

        self.assertEqual(self.archive_category(mine).status_code, 200)
        kept = RecurringPaymentOccurrence.objects.get(pk=occurrence["id"])
        self.assertEqual(kept.category_id, mine["id"])
