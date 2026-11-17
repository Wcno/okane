"""Derives the Balance of an Account from what was recorded (ADR 0002).

Each module that records money (Income, Expense, Transfer, Investment
Transaction) registers a source here. Accounts never import those modules.
"""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db.models import Q

from accounts.models import Account

MOVEMENT_TYPES = ("buy", "dividend", "expense", "income", "sell", "transfer")

_sources = []


def register(source):
    """Add a source of ledger records.

    A source has two methods, both taking a collection of Account ids:
    `balance_changes(account_ids)` returns the signed sum of its records per
    Account id, and `accounts_with_records(account_ids)` returns the ids that
    have at least one record. Ids without records may be left out of both.
    A source whose records move money into or out of an investment Account also
    has `net_contribution_changes(account_ids)`, shaped like `balance_changes`.
    Both change methods also take `as_of`, a day: only records dated up to and
    including it count. It is passed only when a past closing is asked for.
    A source that also lists records for the Movements view has
    `movements(user_id, wanted, limit)`, described at `movements`.
    """
    _sources.append(source)


def unregister(source):
    _sources.remove(source)


def _options(as_of):
    return {} if as_of is None else {"as_of": as_of}


def _opening(account, as_of):
    """The opening balance counts from the day the Account starts."""
    started = as_of is None or account.opening_date <= as_of
    return account.opening_balance if started else Decimal(0)


def balances(accounts, as_of=None):
    """Return the Balance of each Account, keyed by Account id; with `as_of`, at the end of that day."""
    totals = {account.id: _opening(account, as_of) for account in accounts}
    for source in _sources:
        for account_id, change in source.balance_changes(totals.keys(), **_options(as_of)).items():
            totals[account_id] += Decimal(change)
    return totals


def net_contributions(accounts, as_of=None):
    """Return the Net Contribution of each investment Account, keyed by Account id; with `as_of`, at the end of that day.

    It starts from the opening balance, the first Contribution, and adds what
    entered minus what left by Transfer.
    """
    totals = {
        account.id: _opening(account, as_of)
        for account in accounts
        if account.type == Account.Type.INVESTMENT
    }
    for source in _sources:
        changes = getattr(source, "net_contribution_changes", None)
        if changes is None:
            continue
        for account_id, change in changes(totals.keys(), **_options(as_of)).items():
            totals[account_id] += Decimal(change)
    return totals


def accounts_with_records(accounts):
    """Return the ids of the Accounts that some record refers to."""
    ids = {account.id for account in accounts}
    found = set()
    for source in _sources:
        found |= set(source.accounts_with_records(ids))
    return found & ids


@dataclass(frozen=True)
class MovementFilter:
    """What the Movements view asks for; an empty filter asks for everything of the User."""

    types: frozenset = frozenset(MOVEMENT_TYPES)
    account_id: int | None = None
    start: date | None = None
    end: date | None = None

    def wants(self, *types):
        return bool(self.types.intersection(types))

    def narrow(self, records, account_fields):
        """The records of the period and of the Account, when it is any of `account_fields`."""
        if self.start is not None:
            records = records.filter(date__gte=self.start)
        if self.end is not None:
            records = records.filter(date__lte=self.end)
        if self.account_id is not None:
            matches = Q()
            for field in account_fields:
                matches |= Q(**{f"{field}_id": self.account_id})
            records = records.filter(matches)
        return records


def movement_row(type, id, date, amount, account_id, **specific):
    """One Movement as the view lists it; what a type does not have is `None`.

    A Transfer's `account_id` is the Account the money left.
    """
    return {
        "type": type,
        "id": id,
        "date": date,
        "amount": f"{amount:f}",
        "account_id": account_id,
        "destination_account_id": None,
        "category_id": None,
        "description": "",
        "asset": None,
        "units": None,
        "unit_price": None,
        "commission": None,
        **specific,
    }


def movement_sort_key(movement):
    """Newest day first, then by type and the highest id first: stable across pages."""
    return (-movement["date"].toordinal(), movement["type"], -movement["id"])


def movements(user_id, wanted, limit):
    """Return `(total, first `limit` movements)` of the User's records matching `wanted`.

    Each source answers `(count, rows)` for its own records already in the
    shared order; the first `limit` of all of them is found by merging. A row
    is a dict with `type`, `id`, `date`, `amount` and the Accounts it touches.
    """
    total = 0
    rows = []
    for source in _sources:
        listing = getattr(source, "movements", None)
        if listing is None:
            continue
        count, found = listing(user_id, wanted, limit)
        total += count
        rows.extend(found)
    return total, sorted(rows, key=movement_sort_key)[:limit]
def archive_blockers(account):
    """Messages for what must be resolved before `account` can be archived.

    A source may define `archive_blockers(account)`; sources without it never block.
    """
    blockers = []
    for source in _sources:
        check = getattr(source, "archive_blockers", None)
        if check is not None:
            blockers.extend(check(account))
    return blockers


def statement(account):
    """Return the Statement of an Account: every movement in order, each with its Balance.

    It starts with the opening balance on the Account's opening date. The order is
    the date, then the order of registration, then the source and the record id,
    so two movements of one day always keep the same place. Each line's Balance
    is computed over the whole history, so it never depends on the page asked for.
    A source that moves money in an Account offers `statement_entries(account_id)`:
    dicts with `kind`, `record_id`, `date`, `created_at`, `description` and the
    signed `amount`, plus the fields that describe the record.
    """
    entries = []
    for source in _sources:
        entries_of = getattr(source, "statement_entries", None)
        if entries_of is not None:
            entries.extend(entries_of(account.id))
    entries.sort(
        key=lambda entry: (entry["date"], entry["created_at"], entry["kind"], entry["record_id"])
    )

    opening = {
        "kind": "opening",
        "record_id": account.id,
        "date": account.opening_date,
        "description": "",
        "amount": account.opening_balance,
    }
    lines = []
    balance = Decimal(0)
    for position, entry in enumerate([opening, *entries], start=1):
        balance += Decimal(entry["amount"])
        lines.append({**entry, "id": position, "balance": balance})
    return lines
