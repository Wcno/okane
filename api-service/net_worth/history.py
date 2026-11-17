"""The monthly series of the User's Patrimonio and what moved it (docs/contratos.md, ADR 0004).

Patrimonio at a closing = the Balances of the non-investment Accounts + the value of the
investment Accounts (cash and Positions). Each month's change splits into the opening
balances of the Accounts that start in it, its Ahorro neto and its Rendimiento del período,
so that final - initial = incorporations + net savings + return. Nothing is stored.
"""

import datetime
from decimal import Decimal

from accounts import clock, ledger
from accounts.models import Account
from expenses.models import Expense
from incomes.models import Income
from investments.performance import portfolio_of
from recurring_payments import schedule

ZERO = Decimal("0.00")


def _total(amounts):
    return sum(amounts, ZERO)


def _closing(user_id, accounts, as_of):
    """Patrimonio, cumulative Rendimiento and whether any price is an estimate at the end of `as_of`."""
    cash_accounts = [
        account
        for account in accounts
        if account.type != Account.Type.INVESTMENT and account.opening_date <= as_of
    ]
    balances = ledger.balances(cash_accounts, as_of)
    portfolio = portfolio_of(user_id, as_of)
    return {
        "net_worth": _total(balances.values()) + Decimal(portfolio["value"]),
        "cumulative_return": Decimal(portfolio["return"]["amount"]),
        "estimated": portfolio["estimated"],
    }


def net_worth_at(user_id, as_of):
    """The User's Patrimonio at the end of `as_of`, the figure the Panel shows."""
    accounts = list(Account.objects.filter(user_id=user_id, opening_date__lte=as_of))
    return _closing(user_id, accounts, as_of)["net_worth"]


def _in_period(model, user_id, first_day, last_day):
    amounts = model.objects.filter(
        user_id=user_id, date__gte=first_day, date__lte=last_day
    ).values_list("amount", flat=True)
    return _total(amounts)


def history_of(user_id):
    """One entry per month from the first Account's start to the current month, which ends today."""
    today = clock.today()
    accounts = list(Account.objects.filter(user_id=user_id, opening_date__lte=today))
    if not accounts:
        return {"as_of": today.isoformat(), "periods": []}

    closings = {}

    def closing(day):
        if day not in closings:
            closings[day] = _closing(user_id, accounts, day)
        return closings[day]

    periods = []
    month = schedule.month_start(min(account.opening_date for account in accounts))
    while month <= today:
        end = min(schedule.month_end(month), today)
        start = month - datetime.timedelta(days=1)
        opening, final = closing(start), closing(end)
        incorporations = _total(
            account.opening_balance for account in accounts if month <= account.opening_date <= end
        )
        net_savings = _in_period(Income, user_id, month, end) - _in_period(Expense, user_id, month, end)
        periods.append(
            {
                "month": month.strftime("%Y-%m"),
                "opening_cut": start.isoformat(),
                "closing_cut": end.isoformat(),
                "opening_net_worth": str(opening["net_worth"]),
                "net_worth": str(final["net_worth"]),
                "opening_balances_added": str(incorporations),
                "net_savings": str(net_savings),
                "return": str(final["cumulative_return"] - opening["cumulative_return"]),
                "estimated": final["estimated"],
            }
        )
        month = schedule.month_end(month) + datetime.timedelta(days=1)
    return {"as_of": today.isoformat(), "periods": periods}
