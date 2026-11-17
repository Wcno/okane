"""Derives the Balance of an Account from what was recorded (ADR 0002).

Each module that records money (Income, Expense, Transfer, Investment
Transaction) registers a source here. Accounts never import those modules.
"""

from decimal import Decimal

_sources = []


def register(source):
    """Add a source of ledger records.

    A source has two methods, both taking a collection of Account ids:
    `balance_changes(account_ids)` returns the signed sum of its records per
    Account id, and `accounts_with_records(account_ids)` returns the ids that
    have at least one record. Ids without records may be left out of both.
    """
    _sources.append(source)


def unregister(source):
    _sources.remove(source)


def balances(accounts):
    """Return the Balance of each Account, keyed by Account id."""
    totals = {account.id: account.opening_balance for account in accounts}
    for source in _sources:
        for account_id, change in source.balance_changes(totals.keys()).items():
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
