import datetime

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase, tag

BEFORE = [
    ("categories", "0001_initial"),
    ("expenses", "0002_category_foreign_key"),
    ("budgets", "0002_category_foreign_key"),
    ("recurring_payments", "0002_category_foreign_key"),
]
AFTER = [("categories", "0003_category_owner_required")]


def migrate(targets):
    executor = MigrationExecutor(connection)
    executor.migrate(targets)
    executor = MigrationExecutor(connection)
    return executor.loader.project_state(targets).apps


@tag("database")
class PerUserCategoriesMigrationTests(TransactionTestCase):
    """Rows written while Categories were the fixed catalog 1 to 8 move to each User's own copy."""

    def tearDown(self):
        migrate(MigrationExecutor(connection).loader.graph.leaf_nodes())
        super().tearDown()

    def test_each_user_gets_a_copy_and_their_records_follow_it(self):
        old = migrate(BEFORE)
        day = datetime.date(2026, 11, 2)
        month = datetime.date(2026, 11, 1)
        for pk in range(1, 9):
            old.get_model("categories", "Category").objects.update_or_create(
                pk=pk, defaults={"name": f"fixed {pk}"}
            )
        for user_id, category_id in ((1, 5), (2, 5)):
            account = old.get_model("accounts", "Account").objects.create(
                user_id=user_id, name="Cuenta", type="spending", opening_balance=0, opening_date=day
            )
            old.get_model("expenses", "Expense").objects.create(
                user_id=user_id, account=account, category_id=category_id, amount=10, date=day
            )
            old.get_model("budgets", "Budget").objects.create(
                user_id=user_id, category_id=3, month=month, amount=50
            )
            rule = old.get_model("recurring_payments", "RecurringPayment").objects.create(
                user_id=user_id,
                account=account,
                category_id=1,
                amount=20,
                day_of_month=5,
                start_date=month,
            )
            old.get_model("recurring_payments", "RecurringPaymentOccurrence").objects.create(
                user_id=user_id,
                recurring_payment=rule,
                month=month,
                amount=20,
                account=account,
                category_id=1,
                due_date=datetime.date(2026, 11, 5),
                reserved_from=month,
                status="cancelled",
            )

        new = migrate(AFTER)

        Category = new.get_model("categories", "Category")
        self.assertFalse(Category.objects.filter(user_id__isnull=True).exists())
        self.assertEqual(new.get_model("categories", "InitialCatalogCopy").objects.count(), 2)
        for user_id in (1, 2):
            own = {category.key: category for category in Category.objects.filter(user_id=user_id)}
            self.assertEqual(len(own), 8)
            self.assertEqual(own["health"].name, "Salud")
            expense = new.get_model("expenses", "Expense").objects.get(user_id=user_id)
            budget = new.get_model("budgets", "Budget").objects.get(user_id=user_id)
            rule = new.get_model("recurring_payments", "RecurringPayment").objects.get(user_id=user_id)
            occurrence = new.get_model(
                "recurring_payments", "RecurringPaymentOccurrence"
            ).objects.get(user_id=user_id)
            self.assertEqual(expense.category_id, own["health"].pk)
            self.assertEqual(budget.category_id, own["transport"].pk)
            self.assertEqual(rule.category_id, own["housing"].pk)
            self.assertEqual(occurrence.category_id, own["housing"].pk)
        self.assertNotEqual(
            new.get_model("expenses", "Expense").objects.get(user_id=1).category_id,
            new.get_model("expenses", "Expense").objects.get(user_id=2).category_id,
        )

    def test_a_database_without_records_ends_with_no_categories(self):
        migrate(BEFORE)

        new = migrate(AFTER)

        self.assertEqual(new.get_model("categories", "Category").objects.count(), 0)
        self.assertEqual(new.get_model("categories", "InitialCatalogCopy").objects.count(), 0)
