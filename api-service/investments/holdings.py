"""Average-cost holdings of one Asset in one Account, replayed from its transactions.

Costs keep full decimal precision: the average is never rounded to cents
between operations (docs/contratos.md, "Fechas y cantidades"). Rounding happens
only where a figure leaves the calculation, always half away from zero
(ROUND_HALF_UP on positive numbers): cash to cents when an operation is recorded
(serializers.cash_for) and costs, values and averages for display, to cents or to
eight places (positions.fixed).
"""

import functools
from dataclasses import dataclass
from decimal import Decimal, localcontext

from investments.models import InvestmentTransaction

ZERO = Decimal(0)
# Twelve digits of units times twelve of price, each with eight decimals, fit exactly.
PRECISION = 60


def exact(function):
    """Run `function` with enough digits for products of units and prices never to round."""

    @functools.wraps(function)
    def run(*args, **kwargs):
        with localcontext() as context:
            context.prec = PRECISION
            return function(*args, **kwargs)

    return run


@dataclass(frozen=True)
class Holding:
    units: Decimal = ZERO
    cost: Decimal = ZERO

    @property
    def average_cost(self):
        return self.cost / self.units if self.units else ZERO

    def apply(self, kind, units, unit_price, commission=ZERO):
        if kind == InvestmentTransaction.Type.BUY:
            # A purchase commission is part of what the units cost.
            return Holding(self.units + units, self.cost + units * unit_price + commission)
        remaining = self.units - units
        if remaining == 0:
            # A Position that reaches zero starts its cost over.
            return Holding()
        # A sale takes out cost at the average held before it; the sale price never enters.
        return Holding(remaining, self.cost * remaining / self.units)


@exact
def replay(transactions):
    """Fold ordered transactions into a Holding."""
    holding = Holding()
    for transaction in transactions:
        if transaction.type == InvestmentTransaction.Type.DIVIDEND:
            continue
        holding = holding.apply(
            transaction.type, transaction.units, transaction.unit_price, transaction.commission
        )
    return holding


def units_held(transactions, day):
    """Units held after every purchase and sale dated `day` or earlier."""
    units = ZERO
    for transaction in transactions:
        if transaction.type == InvestmentTransaction.Type.DIVIDEND or transaction.date > day:
            continue
        sign = 1 if transaction.type == InvestmentTransaction.Type.BUY else -1
        units += sign * transaction.units
    return units


def trimmed(units):
    """Units as a User reads them: no trailing zeros, at least one digit."""
    text = f"{units:f}"
    return text.rstrip("0").rstrip(".") if "." in text else text


def units_phrase(units):
    """"1 unidad" or "2.5 unidades", the way a Spanish sentence reads them."""
    text = trimmed(units)
    return f"{text} {'unidad' if text == '1' else 'unidades'}"


def sellable_units(transactions, sale_date):
    """Most units a sale on `sale_date` can take without any later moment going negative.

    `transactions` are the ordered existing ones; the sale would be recorded
    after every one of the same day.
    """
    units = ZERO
    sellable = None
    for transaction in transactions:
        if transaction.type == InvestmentTransaction.Type.DIVIDEND:
            continue
        if transaction.date > sale_date and sellable is None:
            sellable = units
        sign = 1 if transaction.type == InvestmentTransaction.Type.BUY else -1
        units += sign * transaction.units
        if sellable is not None:
            sellable = min(sellable, units)
    return units if sellable is None else sellable
