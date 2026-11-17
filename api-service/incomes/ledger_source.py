from django.db.models import Sum

from incomes.models import Income


class IncomeLedgerSource:
    """Lets the ledger derive Balances from Incomes (ADR 0002)."""

    def balance_changes(self, account_ids):
        totals = (
            Income.objects.filter(account_id__in=account_ids)
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
