"""Positions: what a User holds of each Asset, derived from the recorded transactions.

Nothing here is stored (docs/matrices.md): a Position is the average-cost replay of
the purchases and sales of one Asset in one Account, grouped by Asset for display.
Its price is the User's own manual Reference Price or, without one as recent as the
last transaction, that transaction's price, flagged as an estimate.
"""

from decimal import ROUND_HALF_UP, Decimal

from investments.holdings import ZERO, Holding, exact, replay
from investments.models import InvestmentTransaction, ReferencePrice

CENT = Decimal("0.01")
EIGHT_PLACES = Decimal("0.00000001")
LAST_TRANSACTION = "last_transaction"
MANUAL = "manual"


def represent_asset(asset):
    return {
        "id": asset.id,
        "provider": asset.provider,
        "market": asset.market,
        "symbol": asset.symbol,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "currency": asset.currency,
    }


def fixed(value, step):
    """Round half away from zero to `step`: cents for money, eight places for units and prices."""
    return f"{value.quantize(step, rounding=ROUND_HALF_UP):f}"


def reference_price(last_transaction, manual):
    """The Reference Price of an Asset: the most recent date wins, the User's own price on a tie.

    A price that is not the User's own comes from the last known transaction, which
    is an estimate. Callers only pass prices up to the valuation day, never a future one.
    """
    if manual is not None and manual.date >= last_transaction.date:
        return {"value": manual.value, "source": MANUAL, "date": manual.date}
    return {
        "value": last_transaction.unit_price,
        "source": LAST_TRANSACTION,
        "date": last_transaction.date,
    }


def represent_price(price):
    return {
        "value": fixed(price["value"], EIGHT_PLACES),
        "source": price["source"],
        "date": price["date"].isoformat(),
        "estimated": price["source"] == LAST_TRANSACTION,
    }


def value_of(units, price):
    """Cash value of units at a price, to cents, halves away from zero."""
    return (units * price["value"]).quantize(CENT, rounding=ROUND_HALF_UP)


@exact
def held(user_id, as_of):
    """What the User holds at the end of `as_of`: one entry per Asset, with its price.

    Each entry has the `asset`, its `price` (see `reference_price`) and its
    `holdings`, a list of (Account, Holding) pairs. Only transactions and manual
    prices up to `as_of` count, so a past closing never sees a later one.
    """
    transactions = list(
        InvestmentTransaction.objects.filter(
            user_id=user_id,
            date__lte=as_of,
            type__in=[InvestmentTransaction.Type.BUY, InvestmentTransaction.Type.SELL],
        )
        .select_related("asset", "account")
        .order_by("date", "id")
    )
    by_holding = {}
    last_transaction = {}
    for transaction in transactions:
        by_holding.setdefault((transaction.asset, transaction.account), []).append(transaction)
        last_transaction[transaction.asset.id] = transaction

    manual = {}
    for price in ReferencePrice.objects.filter(
        user_id=user_id, date__lte=as_of, asset_id__in=last_transaction.keys()
    ).order_by("date"):
        manual[price.asset_id] = price

    grouped = {}
    for (asset, account), history in by_holding.items():
        holding = replay(history)
        if holding.units > 0:
            grouped.setdefault(asset, []).append((account, holding))

    return [
        {
            "asset": asset,
            "price": reference_price(last_transaction[asset.id], manual.get(asset.id)),
            "holdings": sorted(holdings, key=lambda pair: pair[0].id),
        }
        for asset, holdings in grouped.items()
    ]


@exact
def positions_of(user_id, as_of):
    """The User's Positions at the end of `as_of`, grouped by Asset and ordered by value."""
    positions = []
    for entry in held(user_id, as_of):
        holdings = entry["holdings"]
        total = Holding(
            sum((holding.units for _, holding in holdings), ZERO),
            sum((holding.cost for _, holding in holdings), ZERO),
        )
        value = value_of(total.units, entry["price"])
        positions.append(
            {
                "asset": represent_asset(entry["asset"]),
                "units": fixed(total.units, EIGHT_PLACES),
                "cost": fixed(total.cost, CENT),
                "average_cost": fixed(total.average_cost, EIGHT_PLACES),
                "price": represent_price(entry["price"]),
                "value": f"{value:f}",
                "accounts": [
                    {
                        "account_id": account.id,
                        "account_name": account.name,
                        "units": fixed(holding.units, EIGHT_PLACES),
                        "cost": fixed(holding.cost, CENT),
                        "average_cost": fixed(holding.average_cost, EIGHT_PLACES),
                    }
                    for account, holding in holdings
                ],
                "_value": value,
            }
        )

    portfolio_value = sum((position["_value"] for position in positions), ZERO)
    for position in positions:
        value = position.pop("_value")
        # Without value in the portfolio the share does not apply.
        position["portfolio_percent"] = (
            fixed(value * 100 / portfolio_value, CENT) if portfolio_value > 0 else None
        )
    positions.sort(key=lambda position: (-Decimal(position["value"]), position["asset"]["symbol"]))
    return positions
