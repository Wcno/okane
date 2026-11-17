from django.db.models import Sum

from accounts.ledger import movement_row
from incomes.models import Income


class IncomeLedgerSource:
    """Lets the ledger derive Balances from Incomes (ADR 0002)."""

    def balance_changes(self, account_ids, as_of=None):
        records = Income.objects.filter(account_id__in=account_ids)
        if as_of is not None:
            records = records.filter(date__lte=as_of)
        totals = (
            records
            .values("account_id")
            .annotate(total=Sum("amount"))
        )
        return {row["account_id"]: row["total"] for row in totals}

    def accounts_with_records(self, account_ids):
        return set(
            Income.objects.filter(account_id__in=account_ids)
            .values_list("account_id", flat=True)
            .distinct()
        )

    def movements(self, user_id, wanted, limit):
        if not wanted.wants("income"):
            return 0, []
        records = wanted.narrow(Income.objects.filter(user_id=user_id), ["account"])
        return records.count(), [
            movement_row(
                "income", income.id, income.date, income.amount, income.account_id,
                description=income.description,
            )
            for income in records.order_by("-date", "-id")[:limit]
        ]

    def statement_entries(self, account_id):
        return [
            {
                "kind": "income",
                "record_id": income.id,
                "date": income.date,
                "created_at": income.created_at,
                "description": income.description,
                "amount": income.amount,
            }
            for income in Income.objects.filter(account_id=account_id)
        ]
