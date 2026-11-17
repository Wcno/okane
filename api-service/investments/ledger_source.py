from django.db.models import Case, DecimalField, F, Sum, When

from investments.models import InvestmentTransaction


class InvestmentLedgerSource:
    """Lets the ledger derive Balances from purchases and sales (ADR 0002, ADR 0003)."""

    def balance_changes(self, account_ids, as_of=None):
        # A purchase costs its amount plus the commission; a sale brings its amount minus it.
        signed = Case(
            When(type=InvestmentTransaction.Type.BUY, then=-F("cash_amount") - F("commission")),
            When(type=InvestmentTransaction.Type.SELL, then=F("cash_amount") - F("commission")),
            default=F("cash_amount"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        records = InvestmentTransaction.objects.filter(account_id__in=account_ids)
        if as_of is not None:
            records = records.filter(date__lte=as_of)
        totals = (
            records.order_by().values("account_id").annotate(total=Sum(signed))
        )
        return {row["account_id"]: row["total"] for row in totals}

    def accounts_with_records(self, account_ids):
        return set(
            InvestmentTransaction.objects.filter(account_id__in=account_ids)
            .order_by()
            .values_list("account_id", flat=True)
            .distinct()
        )

    def statement_entries(self, account_id):
        trades = InvestmentTransaction.objects.filter(account_id=account_id).select_related("asset")
        return [
            {
                "kind": trade.type,
                "record_id": trade.id,
                "date": trade.date,
                "created_at": trade.created_at,
                "description": "",
                "amount": self._cash_effect(trade),
                "commission": trade.commission,
                "asset": {"symbol": trade.asset.symbol, "name": trade.asset.name},
                "units": trade.units,
            }
            for trade in trades
        ]

    @staticmethod
    def _cash_effect(trade):
        """What the trade did to the cash: the same rule `balance_changes` sums."""
        if trade.type == InvestmentTransaction.Type.BUY:
            return -trade.cash_amount - trade.commission
        if trade.type == InvestmentTransaction.Type.SELL:
            return trade.cash_amount - trade.commission
        return trade.cash_amount
