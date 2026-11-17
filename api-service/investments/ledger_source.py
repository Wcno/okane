from django.db.models import Case, DecimalField, F, Sum, When

from investments.models import InvestmentTransaction


class InvestmentLedgerSource:
    """Lets the ledger derive Balances from purchases and sales (ADR 0002, ADR 0003)."""

    def balance_changes(self, account_ids):
        # A purchase costs its amount plus the commission; a sale brings its amount minus it.
        signed = Case(
            When(type=InvestmentTransaction.Type.BUY, then=-F("cash_amount") - F("commission")),
            When(type=InvestmentTransaction.Type.SELL, then=F("cash_amount") - F("commission")),
            default=F("cash_amount"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        totals = (
            InvestmentTransaction.objects.filter(account_id__in=account_ids)
            .order_by()
            .values("account_id")
            .annotate(total=Sum(signed))
        )
        return {row["account_id"]: row["total"] for row in totals}

    def accounts_with_records(self, account_ids):
        return set(
            InvestmentTransaction.objects.filter(account_id__in=account_ids)
            .order_by()
            .values_list("account_id", flat=True)
            .distinct()
        )
