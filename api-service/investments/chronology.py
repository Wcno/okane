"""Whether the sales of one Asset in one Account still find their units once a record changes.

Positions are replayed in date order with the creation order as the stable
tie-break (docs/contratos.md, "Libro de movimientos"). A correction or a
deletion can move or remove a purchase, so the whole history of every
Position it touches is checked, not only the sales after it.
"""

from dataclasses import dataclass
from decimal import Decimal

from accounts.dates import spanish_day
from investments.holdings import ZERO, units_phrase
from investments.models import InvestmentTransaction

CHANGE_LEAVES_SALE_SHORT = (
    "No puedes guardar este cambio: la venta del {date} vende {requested} "
    "y ese día solo tendrías {held}."
)
DELETE_LEAVES_SALE_SHORT = (
    "No puedes eliminar esta compra: la venta del {date} vende {requested} "
    "y ese día solo tendrías {held}."
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
        if transaction.type == InvestmentTransaction.Type.BUY:
            units += transaction.units
        elif transaction.units > units:
            return Shortfall(sale=transaction, held=units)
        else:
            units -= transaction.units
    return None
