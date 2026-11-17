from django.db import models
from django.db.models import Q

from accounts.models import Account


class Asset(models.Model):
    """Something the User can hold (GLOSSARY.md, Activo), identified by provider and market.

    A symbol alone is not unique: the same ticker can name different assets in
    different markets, so the identity is the provider, the market and the symbol.
    The catalog is shared; prices and Positions belong to each User.
    """

    provider = models.CharField(max_length=30)
    market = models.CharField(max_length=30)
    symbol = models.CharField(max_length=30)
    name = models.CharField(max_length=160)
    asset_type = models.CharField(max_length=60, blank=True)
    currency = models.CharField(max_length=10, blank=True)

    class Meta:
        ordering = ["symbol", "market", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "market", "symbol"], name="asset_identity_unique"
            ),
        ]


class InvestmentTransaction(models.Model):
    """A purchase, a sale or a Dividend of an Asset in an investment Account (GLOSSARY.md).

    A Dividend has no units or price: its cash is the amount the Asset paid.
    """

    class Type(models.TextChoices):
        BUY = "buy"
        SELL = "sell"
        DIVIDEND = "dividend"

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField()
    # An Account with Transactions is archived, never deleted (ADR 0002).
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="investment_transactions"
    )
    asset = models.ForeignKey(Asset, on_delete=models.PROTECT, related_name="transactions")
    type = models.CharField(max_length=8, choices=Type.choices)
    units = models.DecimalField(max_digits=20, decimal_places=8, null=True)
    unit_price = models.DecimalField(max_digits=20, decimal_places=8, null=True)
    # Units times price rounded to cents when recorded, or the amount a Dividend paid: before commission.
    cash_amount = models.DecimalField(max_digits=14, decimal_places=2)
    # What the broker charged on a purchase or a sale, in cents; a Dividend has none.
    commission = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Date, then creation order: the stable order every replay uses.
        ordering = ["date", "id"]
        indexes = [
            models.Index(
                fields=["user_id", "account", "asset", "date", "id"], name="invtx_position"
            ),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(units__gt=0), name="invtx_units_positive"),
            models.CheckConstraint(condition=Q(unit_price__gt=0), name="invtx_price_positive"),
            models.CheckConstraint(condition=Q(cash_amount__gt=0), name="invtx_cash_positive"),
            models.CheckConstraint(
                condition=Q(type__in=["buy", "sell", "dividend"]), name="invtx_type_known"
            ),
            models.CheckConstraint(condition=Q(commission__gte=0), name="invtx_commission_valid"),
            models.CheckConstraint(
                condition=Q(type="dividend", units__isnull=True, unit_price__isnull=True, commission=0)
                | (Q(type__in=["buy", "sell"]) & Q(units__isnull=False, unit_price__isnull=False)),
                name="invtx_shape_by_type",
            ),
        ]


class ReferencePrice(models.Model):
    """The price a User set by hand for an Asset on a day (GLOSSARY.md, Precio de referencia).

    It belongs to the User: it never changes another User's valuations.
    """

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField()
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="reference_prices")
    value = models.DecimalField(max_digits=20, decimal_places=8)
    date = models.DateField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "asset_prices"
        constraints = [
            models.UniqueConstraint(
                fields=["user_id", "asset", "date"], name="reference_price_one_per_day"
            ),
            models.CheckConstraint(condition=Q(value__gt=0), name="reference_price_positive"),
        ]
