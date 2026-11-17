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
