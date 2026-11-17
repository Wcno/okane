from django.db.models import Sum

from expenses.models import Expense


class ExpenseLedgerSource:
    """Lets the ledger derive Balances from Expenses (ADR 0002)."""

    def balance_changes(self, account_ids):
        totals = (
            Expense.objects.filter(account_id__in=account_ids)
            .values("account_id")
            .annotate(total=Sum("amount"))
        )
        return {row["account_id"]: -row["total"] for row in totals}

    def accounts_with_records(self, account_ids):
        return set(
            Expense.objects.filter(account_id__in=account_ids)
            .values_list("account_id", flat=True)
            .distinct()
        )

    def statement_entries(self, account_id):
        return [
            {
                "kind": "expense",
                "record_id": expense.id,
                "date": expense.date,
                "created_at": expense.created_at,
                "description": expense.description,
                "amount": -expense.amount,
                "category_id": expense.category_id,
            }
            for expense in Expense.objects.filter(account_id=account_id)
        ]
