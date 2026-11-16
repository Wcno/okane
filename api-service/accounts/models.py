from django.db import models
from django.db.models import Q


class Account(models.Model):
    """A container of money that belongs to one User (GLOSSARY.md, Cuenta).

    No balance column exists: the Balance is derived from the opening balance
    and the records of the ledger (ADR 0002).
    """

    class Type(models.TextChoices):
        SPENDING = "spending"
        SAVINGS = "savings"
        INVESTMENT = "investment"

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField(db_index=True)
    name = models.CharField(max_length=80)
    type = models.CharField(max_length=10, choices=Type.choices)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2)
    opening_date = models.DateField()
    # A ratio, as in the Projection contract: 4.25% is stored as 0.042500.
    annual_interest_rate = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(annual_interest_rate__isnull=True)
                | Q(type="savings", annual_interest_rate__gte=0),
                name="account_rate_only_on_savings",
            ),
        ]
