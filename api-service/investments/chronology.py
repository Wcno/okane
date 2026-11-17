"""Whether the sales of one Asset in one Account still find their units once a record changes.

Positions are replayed in date order with the creation order as the stable
tie-break (docs/contratos.md, "Libro de movimientos"). A correction or a
deletion can move or remove a purchase, so the whole history of every
Position it touches is checked, not only the sales after it.
"""

from dataclasses import dataclass
from decimal import Decimal

from accounts.dates import spanish_day
from investments.holdings import ZERO, units_held, units_phrase
from investments.models import InvestmentTransaction

CHANGE_LEAVES_SALE_SHORT = (
    "No puedes guardar este cambio: la venta del {date} vende {requested} "
    "y ese día solo tendrías {held}."
)
DELETE_LEAVES_SALE_SHORT = (
    "No puedes eliminar esta compra: la venta del {date} vende {requested} "
    "y ese día solo tendrías {held}."
)
CHANGE_ORPHANS_DIVIDEND = (
    "No puedes guardar este cambio: el Dividendo del {date} quedaría sin unidades "
    "del Activo ese día."
)
DELETE_ORPHANS_DIVIDEND = (
    "No puedes eliminar esta compra: el Dividendo del {date} quedaría sin unidades "
    "del Activo ese día."
)


@dataclass(frozen=True)
class Shortfall:
    """A sale that takes more units than the Position holds at its moment."""

    sale: InvestmentTransaction
    held: Decimal

    def explain(self, template):
        return template.format(
            date=spanish_day(self.sale.date),
            requested=units_phrase(self.sale.units),
            held=units_phrase(self.held),
        )


def history(user_id, account_id, asset_id, *, except_id=None):
    """The ordered transactions of one Position, optionally without one of them."""
    transactions = InvestmentTransaction.objects.filter(
        user_id=user_id, account_id=account_id, asset_id=asset_id
    )
    if except_id is not None:
        transactions = transactions.exclude(pk=except_id)
    return sorted(transactions, key=lambda transaction: (transaction.date, transaction.id))


def first_shortfall(transactions):
    """The first sale that finds fewer units than it sells, or None when every sale is covered."""
    units = ZERO
    for transaction in sorted(transactions, key=lambda t: (t.date, t.id)):
        if transaction.type == InvestmentTransaction.Type.DIVIDEND:
            continue
        if transaction.type == InvestmentTransaction.Type.BUY:
            units += transaction.units
        elif transaction.units > units:
            return Shortfall(sale=transaction, held=units)
        else:
            units -= transaction.units
    return None


def first_unfunded_dividend(transactions):
    """The first Dividend paid on a day the Position holds no units, or None."""
    # A record not saved yet has no id and comes after every one of its day.
    for transaction in sorted(transactions, key=lambda t: (t.date, t.id or float("inf"))):
        if (
            transaction.type == InvestmentTransaction.Type.DIVIDEND
            and units_held(transactions, transaction.date) <= 0
        ):
            return transaction
    return None


def first_problem(transactions, *, sale_message, dividend_message):
    """The reason a Position's history no longer holds together, or None when it does.

    Either a sale that finds fewer units than it sells or a Dividend of units not held.
    """
    shortfall = first_shortfall(transactions)
    if shortfall is not None:
        return shortfall.explain(sale_message)
    unfunded = first_unfunded_dividend(transactions)
    if unfunded is not None:
        return dividend_message.format(date=spanish_day(unfunded.date))
    return None
