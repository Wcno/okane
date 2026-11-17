from decimal import Decimal

from django.db.models import Sum

from accounts.ledger import movement_row
from transfers.models import Transfer


def _totals(account_ids, field, as_of=None):
    records = Transfer.objects.filter(**{f"{field}__in": account_ids})
    if as_of is not None:
        records = records.filter(date__lte=as_of)
    rows = (
        records
        .values(field)
        .annotate(total=Sum("amount"))
    )
    return {row[field]: row["total"] for row in rows}


class TransferLedgerSource:
    """Lets the ledger derive Balances and Net Contributions from Transfers (ADR 0002)."""

    def balance_changes(self, account_ids, as_of=None):
        received = _totals(account_ids, "destination_account_id", as_of)
        sent = _totals(account_ids, "source_account_id", as_of)
        return {
            account_id: received.get(account_id, Decimal(0)) - sent.get(account_id, Decimal(0))
            for account_id in received.keys() | sent.keys()
        }

    def net_contribution_changes(self, account_ids, as_of=None):
        """Transfers in minus Transfers out: what the Account took in or gave back."""
        return self.balance_changes(account_ids, as_of)

    def accounts_with_records(self, account_ids):
        return set(_totals(account_ids, "source_account_id")) | set(
            _totals(account_ids, "destination_account_id")
        )

    def movements(self, user_id, wanted, limit):
        if not wanted.wants("transfer"):
            return 0, []
        # One query row per Transfer, whichever of its two Accounts matched.
        records = wanted.narrow(
            Transfer.objects.filter(user_id=user_id), ["source_account", "destination_account"]
        )
        return records.count(), [
            movement_row(
                "transfer", transfer.id, transfer.date, transfer.amount, transfer.source_account_id,
                destination_account_id=transfer.destination_account_id,
                description=transfer.description,
            )
            for transfer in records.order_by("-date", "-id")[:limit]
        ]
