from django.db.models import Sum

from accounts.ledger import movement_row
from expenses.models import Expense


class ExpenseLedgerSource:
    """Lets the ledger derive Balances from Expenses (ADR 0002)."""

    def balance_changes(self, account_ids, as_of=None):
        records = Expense.objects.filter(account_id__in=account_ids)
        if as_of is not None:
            records = records.filter(date__lte=as_of)
        totals = (
            records
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

    def movements(self, user_id, wanted, limit):
        if not wanted.wants("expense"):
            return 0, []
        records = wanted.narrow(Expense.objects.filter(user_id=user_id), ["account"])
        return records.count(), [
            movement_row(
                "expense", expense.id, expense.date, expense.amount, expense.account_id,
                category_id=expense.category_id, description=expense.description,
            )
            for expense in records.order_by("-date", "-id")[:limit]
        ]

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
