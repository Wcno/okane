from django.db import models
from django.db.models import Q

from accounts.models import Account
from expenses.categories import CATEGORY_IDS

DESCRIPTION_MAX_LENGTH = 140


class Expense(models.Model):
    """Money that left an Account, assigned to one Category (GLOSSARY.md, Gasto)."""

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField()
    # An Account with Expenses is archived, never deleted (ADR 0002).
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="expenses")
    category_id = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField()
    description = models.CharField(max_length=DESCRIPTION_MAX_LENGTH, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [models.Index(fields=["user_id", "-date", "-id"], name="expense_user_feed")]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="expense_amount_positive"),
            models.CheckConstraint(
                condition=Q(category_id__in=CATEGORY_IDS), name="expense_category_in_catalog"
            ),
        ]
