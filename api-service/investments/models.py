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
    """A purchase or a sale of an Asset in an investment Account (GLOSSARY.md)."""

    class Type(models.TextChoices):
        BUY = "buy"
        SELL = "sell"

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField()
    # An Account with Transactions is archived, never deleted (ADR 0002).
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="investment_transactions"
    )
    asset = models.ForeignKey(Asset, on_delete=models.PROTECT, related_name="transactions")
    type = models.CharField(max_length=4, choices=Type.choices)
    units = models.DecimalField(max_digits=20, decimal_places=8)
    unit_price = models.DecimalField(max_digits=20, decimal_places=8)
    # Units times price rounded to cents when recorded: the cash the Balance uses.
    cash_amount = models.DecimalField(max_digits=14, decimal_places=2)
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
            models.CheckConstraint(condition=Q(type__in=["buy", "sell"]), name="invtx_type_known"),
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


class QuotedPrice(models.Model):
    """The closing price the quotes service gave for an Asset on a day.

    Public data, so it is shared by every User and fetched once per Asset. It is
    kept apart from the User's own ReferencePrice, which it never replaces: which
    one a valuation uses is decided when reading (investments.positions).
    """

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="quoted_prices")
    value = models.DecimalField(max_digits=20, decimal_places=8)
    date = models.DateField()
    provider = models.CharField(max_length=30)
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "asset_quotes"
        constraints = [
            models.UniqueConstraint(fields=["asset", "date"], name="quoted_price_one_per_day"),
            models.CheckConstraint(condition=Q(value__gt=0), name="quoted_price_positive"),
        ]
