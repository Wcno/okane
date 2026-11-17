from decimal import Decimal

from django.db.models import Q, Sum

from transfers.models import Transfer


def _totals(account_ids, field):
    rows = (
        Transfer.objects.filter(**{f"{field}__in": account_ids})
        .values(field)
        .annotate(total=Sum("amount"))
    )
    return {row[field]: row["total"] for row in rows}


class TransferLedgerSource:
    """Lets the ledger derive Balances and Net Contributions from Transfers (ADR 0002)."""

    def balance_changes(self, account_ids):
        received = _totals(account_ids, "destination_account_id")
        sent = _totals(account_ids, "source_account_id")
        return {
            account_id: received.get(account_id, Decimal(0)) - sent.get(account_id, Decimal(0))
            for account_id in received.keys() | sent.keys()
        }

    def net_contribution_changes(self, account_ids):
        """Transfers in minus Transfers out: what the Account took in or gave back."""
        return self.balance_changes(account_ids)

    def accounts_with_records(self, account_ids):
        return set(_totals(account_ids, "source_account_id")) | set(
            _totals(account_ids, "destination_account_id")
        )

    def statement_entries(self, account_id):
        """Each Transfer once for this Account: out of it, or into it."""
        entries = []
        for transfer in Transfer.objects.filter(
            Q(source_account_id=account_id) | Q(destination_account_id=account_id)
        ):
            leaving = transfer.source_account_id == account_id
            entries.append(
                {
                    "kind": "transfer_out" if leaving else "transfer_in",
                    "record_id": transfer.id,
                    "date": transfer.date,
                    "created_at": transfer.created_at,
                    "description": transfer.description,
                    "amount": -transfer.amount if leaving else transfer.amount,
                    "counterpart_account_id": (
                        transfer.destination_account_id if leaving else transfer.source_account_id
                    ),
                }
            )
        return entries
