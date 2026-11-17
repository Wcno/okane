"""Value, Net Contribution and Return of the User's investment Accounts (docs/contratos.md).

Return = cash of the Account + value of its Positions - Net Contribution, where the
Net Contribution counts the opening balance as the first Contribution (ADR 0003).
The simple return over the Net Contribution does not apply when that is not positive.
Nothing is stored: every figure is derived on each request.
"""

import datetime
from decimal import Decimal

from accounts import ledger
from accounts.models import Account
from investments.holdings import ZERO, exact
from investments.positions import CENT, LAST_TRANSACTION, fixed, held, positions_of, value_of

# Positions shown in the distribution; the rest share one line.
DISTRIBUTION_LIMIT = 7


def money(value):
    return fixed(value, CENT)


def return_percent(amount, net_contribution):
    """Simple return over the Net Contribution; null when there is no positive base."""
    return money(amount * 100 / net_contribution) if net_contribution > 0 else None


def represent_return(amount, net_contribution):
    return {"amount": money(amount), "percent": return_percent(amount, net_contribution)}


@exact
def account_figures(user_id, as_of):
    """Cash, Positions value, Net Contribution and Return of each investment Account, archived included."""
    # An Account that starts after the closing is not part of it yet.
    accounts = list(
        Account.objects.filter(
            user_id=user_id, type=Account.Type.INVESTMENT, opening_date__lte=as_of
        )
    )
    cash = ledger.balances(accounts, as_of)
    contributions = ledger.net_contributions(accounts, as_of)

    positions_value = dict.fromkeys(cash, ZERO)
    estimated = set()
    for entry in held(user_id, as_of):
        for account, holding in entry["holdings"]:
            positions_value[account.id] += value_of(holding.units, entry["price"])
            if entry["price"]["source"] == LAST_TRANSACTION:
                estimated.add(account.id)

    return [
        {
            "account": account,
            "cash": cash[account.id],
            "positions_value": positions_value[account.id],
            "net_contribution": contributions[account.id],
            "estimated": account.id in estimated,
        }
        for account in accounts
    ]


def represent_account(figures):
    value = figures["cash"] + figures["positions_value"]
    amount = value - figures["net_contribution"]
    return {
        "id": figures["account"].id,
        "name": figures["account"].name,
        "archived": figures["account"].archived_at is not None,
        "cash": money(figures["cash"]),
        "positions_value": money(figures["positions_value"]),
        "value": money(value),
        "net_contribution": money(figures["net_contribution"]),
        "return": represent_return(amount, figures["net_contribution"]),
        "estimated": figures["estimated"],
    }


@exact
def portfolio_of(user_id, as_of):
    """The portfolio at the end of `as_of`: the sum of the User's investment Accounts.

    A Transfer between two investment Accounts adds to one Net Contribution what it
    takes from the other, so it cancels here.
    """
    figures = account_figures(user_id, as_of)
    cash = sum((item["cash"] for item in figures), ZERO)
    positions_value = sum((item["positions_value"] for item in figures), ZERO)
    net_contribution = sum((item["net_contribution"] for item in figures), ZERO)
    value = cash + positions_value
    return {
        "as_of": as_of.isoformat(),
        "value": money(value),
        "cash": money(cash),
        "positions_value": money(positions_value),
        "net_contribution": money(net_contribution),
        "return": represent_return(value - net_contribution, net_contribution),
        "estimated": any(item["estimated"] for item in figures),
        "accounts": [represent_account(item) for item in figures],
    }


def dashboard_of(user_id, as_of):
    """The portfolio plus its distribution by Asset, largest first."""
    positions = positions_of(user_id, as_of)
    shown = positions[:DISTRIBUTION_LIMIT]
    rest = positions[DISTRIBUTION_LIMIT:]
    total = sum((Decimal(position["value"]) for position in positions), ZERO)
    others = sum((Decimal(position["value"]) for position in rest), ZERO)
    return {
        **portfolio_of(user_id, as_of),
        "distribution": [
            {
                "asset": position["asset"],
                "value": position["value"],
                "portfolio_percent": position["portfolio_percent"],
                "price": position["price"],
            }
            for position in shown
        ],
        "others_value": money(others) if rest else None,
        "others_percent": money(others * 100 / total) if rest and total > 0 else None,
    }


def period_return(user_id, first_day, as_of):
    """Return of the period from `first_day` to `as_of`: the cumulative Return at the close
    minus the one at the start, which is the close of the day before `first_day`.

    Contributions and Accounts that enter during the period cancel out: both cuts
    subtract their own Net Contribution.
    """
    opening = portfolio_of(user_id, first_day - datetime.timedelta(days=1))
    closing = portfolio_of(user_id, as_of)
    amount = Decimal(closing["return"]["amount"]) - Decimal(opening["return"]["amount"])
    return {
        "from": first_day.isoformat(),
        "to": as_of.isoformat(),
        "opening_return": opening["return"]["amount"],
        "closing_return": closing["return"]["amount"],
        "return": money(amount),
    }


def performance_of(user_id, as_of, first_day=None):
    """The portfolio plus what each Position gained or lost against its cost.

    With `first_day`, also the Return of the period that starts that day.
    """
    positions = []
    for position in positions_of(user_id, as_of):
        cost = Decimal(position["cost"])
        gain = Decimal(position["value"]) - cost
        positions.append(
            {
                "asset": position["asset"],
                "units": position["units"],
                "cost": position["cost"],
                "value": position["value"],
                "gain": money(gain),
                "gain_percent": money(gain * 100 / cost) if cost > 0 else None,
                "price": position["price"],
            }
        )
    period = None if first_day is None else period_return(user_id, first_day, as_of)
    return {**portfolio_of(user_id, as_of), "positions": positions, "period": period}
