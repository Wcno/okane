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


def net_contributions(accounts):
    """Return the Net Contribution of each investment Account, keyed by Account id.

    It starts from the opening balance, the first Contribution, and adds what
    entered minus what left by Transfer.
    """
    totals = {
        account.id: account.opening_balance
        for account in accounts
        if account.type == Account.Type.INVESTMENT
    }
    for source in _sources:
        changes = getattr(source, "net_contribution_changes", None)
        if changes is None:
            continue
        for account_id, change in changes(totals.keys()).items():
            totals[account_id] += Decimal(change)
    return totals


def accounts_with_records(accounts):
    """Return the ids of the Accounts that some record refers to."""
    ids = {account.id for account in accounts}
    found = set()
    for source in _sources:
        found |= set(source.accounts_with_records(ids))
    return found & ids
