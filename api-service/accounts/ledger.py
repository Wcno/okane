"""Derives the Balance of an Account from what was recorded (ADR 0002).

Each module that records money (Income, Expense, Transfer, Investment
Transaction) registers a source here. Accounts never import those modules.
"""

from decimal import Decimal

from accounts.models import Account

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
