"""Positions: what a User holds of each Asset, derived from the recorded transactions.

Nothing here is stored (docs/matrices.md): a Position is the average-cost replay of
the purchases and sales of one Asset in one Account, grouped by Asset for display.
"""

from decimal import ROUND_HALF_UP, Decimal

from investments.holdings import ZERO, Holding, exact, replay
from investments.models import InvestmentTransaction

CENT = Decimal("0.01")
EIGHT_PLACES = Decimal("0.00000001")
LAST_TRANSACTION = "last_transaction"


def fixed(value, step):
    return f"{value.quantize(step, rounding=ROUND_HALF_UP):f}"


@exact
def positions_of(user_id, as_of):
    """The User's Positions at the end of `as_of`, grouped by Asset and ordered by value.

    A Reference Price is the price of the last known transaction of that Asset;
    only transactions up to `as_of` count, so a past closing never sees a later one.
    """
    transactions = list(
        InvestmentTransaction.objects.filter(user_id=user_id, date__lte=as_of)
        .select_related("asset", "account")
        .order_by("date", "id")
    )
    by_holding = {}
    last_price = {}
    for transaction in transactions:
        by_holding.setdefault((transaction.asset, transaction.account), []).append(transaction)
        last_price[transaction.asset.id] = transaction

    grouped = {}
    for (asset, account), history in by_holding.items():
        holding = replay(history)
        if holding.units > 0:
            grouped.setdefault(asset, []).append((account, holding))

    positions = []
    for asset, holdings in grouped.items():
        total = Holding(
            sum((holding.units for _, holding in holdings), ZERO),
            sum((holding.cost for _, holding in holdings), ZERO),
        )
        priced = last_price[asset.id]
        value = (total.units * priced.unit_price).quantize(CENT, rounding=ROUND_HALF_UP)
        positions.append(
            {
                "asset": {
                    "id": asset.id,
                    "symbol": asset.symbol,
                    "name": asset.name,
                    "market": asset.market,
                    "currency": asset.currency,
                },
                "units": fixed(total.units, EIGHT_PLACES),
                "cost": fixed(total.cost, CENT),
                "average_cost": fixed(total.average_cost, EIGHT_PLACES),
                "price": {
                    "value": fixed(priced.unit_price, EIGHT_PLACES),
                    "source": LAST_TRANSACTION,
                    "date": priced.date.isoformat(),
                },
                "value": f"{value:f}",
                "accounts": [
                    {
                        "account_id": account.id,
                        "account_name": account.name,
                        "units": fixed(holding.units, EIGHT_PLACES),
                        "cost": fixed(holding.cost, CENT),
                        "average_cost": fixed(holding.average_cost, EIGHT_PLACES),
                    }
                    for account, holding in sorted(holdings, key=lambda pair: pair[0].id)
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
