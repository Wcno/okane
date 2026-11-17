from budgets.models import Budget
from budgets.tests import BUDGETS, BudgetApiTestCase
from categories.models import Category
from recurring_payments.models import RecurringPaymentOccurrence

CATEGORIES = "/api/categories"
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
INITIAL_KEYS = ["housing", "food", "transport", "utilities", "health", "entertainment", "education", "other"]


class CategoryApiTestCase(BudgetApiTestCase):
    def create_category(self, user=1, name="Mascotas"):
        return self.call("POST", CATEGORIES, {"name": name}, user=user)

    def category(self, user=1, **fields):
        response = self.create_category(user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def archive_category(self, category, user=1):
        return self.call("POST", f"{CATEGORIES}/{category['id']}/archive", user=user)

    def restore_category(self, category, user=1):
        return self.call("POST", f"{CATEGORIES}/{category['id']}/restore", user=user)

    def remove_category(self, category, user=1):
        return self.call("DELETE", f"{CATEGORIES}/{category['id']}", user=user)

    def listed(self, user=1):
        response = self.call("GET", CATEGORIES, user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def initial(self, key, user=1):
        return next(item for item in self.listed(user) if item["key"] == key)


class InitialCatalogTests(CategoryApiTestCase):
    def test_a_new_user_gets_their_own_copy_of_the_initial_catalog(self):
        listed = self.listed(user=77)

        self.assertEqual([item["name"] for item in listed], INITIAL_NAMES)
        self.assertEqual([item["key"] for item in listed], INITIAL_KEYS)
        self.assertTrue(all(item["archived_at"] is None for item in listed))
        self.assertTrue(all(not item["has_records"] for item in listed))

    def test_the_copy_is_made_once_and_is_not_shared_between_users(self):
        first = self.listed(user=1)
        again = self.listed(user=1)
        other = self.listed(user=2)

        self.assertEqual(first, again)
        self.assertEqual(Category.objects.filter(user_id=1).count(), 8)
        self.assertFalse({item["id"] for item in first} & {item["id"] for item in other})

    def test_a_user_who_removed_every_category_does_not_get_the_catalog_back(self):
        for item in self.listed():
            self.assertEqual(self.remove_category(item).status_code, 204)

        self.assertEqual(self.listed(), [])

    def test_existing_expenses_and_budgets_keep_their_category(self):
        account = self.account()
        expense = self.registered(account, category_id=self.HOUSING)
        budget = self.budget(category_id=self.HOUSING)

        self.assertEqual(expense["category_id"], self.HOUSING)
        self.assertEqual(budget["category_id"], self.HOUSING)
        self.assertEqual(Category.objects.get(pk=self.HOUSING).name, "Vivienda")

    def test_an_initial_category_can_be_renamed_and_archived(self):
        housing = self.initial("housing")

        renamed = self.call("PUT", f"{CATEGORIES}/{housing['id']}", {"name": "Casa"})
        archived = self.archive_category(housing)

        self.assertEqual(renamed.status_code, 200, renamed.content)
        self.assertEqual(renamed.json()["key"], "housing")
        self.assertEqual(archived.status_code, 200, archived.content)
        self.assertIsNotNone(archived.json()["archived_at"])


class OwnCategoryTests(CategoryApiTestCase):
    def test_creates_renames_and_reads_a_category(self):
        created = self.category()
        self.assertEqual(
            created,
            {
                "id": created["id"],
                "name": "Mascotas",
                "key": None,
                "has_records": False,
                "archived_at": None,
            },
        )

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
        self.assertEqual(self.remove_category(mine, user=2).status_code, 404)
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


class RestoreCategoryTests(CategoryApiTestCase):
    def test_restoring_an_archived_category_offers_it_again(self):
        mine = self.category()
        self.archive_category(mine)

        restored = self.restore_category(mine)

        self.assertEqual(restored.status_code, 200, restored.content)
        self.assertIsNone(restored.json()["archived_at"])
        self.assertIsNone(next(item for item in self.listed() if item["id"] == mine["id"])["archived_at"])
        self.assertEqual(self.restore_category(mine).status_code, 200)

    def test_restoring_an_active_category_changes_nothing(self):
        mine = self.category()

        restored = self.restore_category(mine)

        self.assertEqual(restored.status_code, 200, restored.content)
        self.assertIsNone(restored.json()["archived_at"])

    def test_restoring_is_refused_while_an_active_category_has_the_name(self):
        old = self.category(name="Mascotas")
        self.archive_category(old)
        self.category(name="mascotas")

        refused = self.restore_category(old)

        self.assertEqual(refused.status_code, 409, refused.content)
        self.assertIn("errors", refused.json())
        self.assertIsNotNone(
            next(item for item in self.listed() if item["id"] == old["id"])["archived_at"]
        )

    def test_another_users_category_cannot_be_restored(self):
        mine = self.category()
        self.archive_category(mine)

        self.assertEqual(self.restore_category(mine, user=2).status_code, 404)

    def test_an_archived_category_without_records_can_be_deleted_for_good(self):
        mine = self.category()
        self.archive_category(mine)

        self.assertEqual(self.remove_category(mine).status_code, 204)
        self.assertNotIn(mine["id"], [item["id"] for item in self.listed()])


class DeleteCategoryTests(CategoryApiTestCase):
    def test_a_category_without_records_is_deleted_for_good(self):
        unused = self.initial("entertainment")

        response = self.remove_category(unused)

        self.assertEqual(response.status_code, 204)
        self.assertNotIn(unused["id"], [item["id"] for item in self.listed()])
        self.assertFalse(Category.objects.filter(pk=unused["id"]).exists())

    def test_a_category_with_an_expense_is_archived_instead(self):
        account = self.account()
        used = self.category()
        self.registered(account, category_id=used["id"], amount="25.00")
        self.assertTrue(next(i for i in self.listed() if i["id"] == used["id"])["has_records"])

        response = self.remove_category(used)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNotNone(response.json()["archived_at"])
        self.assertTrue(Category.objects.filter(pk=used["id"]).exists())

    def test_a_category_with_a_budget_is_archived_instead(self):
        used = self.initial("food")
        self.budget(category_id=used["id"])

        response = self.remove_category(used)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNotNone(response.json()["archived_at"])
        self.assertEqual(Budget.objects.filter(category_id=used["id"]).count(), 1)

    def test_a_category_with_a_recurring_rule_must_be_cleared_first(self):
        account = self.account()
        used = self.category()
        self.rule(account, category_id=used["id"])

        response = self.remove_category(used)

        self.assertEqual(response.status_code, 409)
        self.assertIn("pagos recurrentes", response.json()["errors"]["form"][0])
        self.assertTrue(Category.objects.filter(pk=used["id"], archived_at__isnull=True).exists())


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
        expense = self.registered(account, category_id=self.HOUSING)

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
        self.call("DELETE", f"/api/recurring-payments/{occurrence['recurring_payment_id']}")

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
        # With a reservation on record the Category is archived, never deleted.
        self.assertEqual(self.remove_category(mine).status_code, 200)
