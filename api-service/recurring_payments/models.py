from django.db import models
from django.db.models import Q

from accounts.models import Account
from expenses.categories import CATEGORY_IDS
from expenses.models import DESCRIPTION_MAX_LENGTH


class RecurringPayment(models.Model):
    """A monthly rule that reserves money for a fixed payment (GLOSSARY.md, Pago recurrente).

    A rule that already produced occurrences is never deleted, only marked with
    `deleted_at`: its pending occurrences stay committed until the User resolves them.
    """

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField(db_index=True)
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="recurring_payments")
    category_id = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=DESCRIPTION_MAX_LENGTH, blank=True)
    day_of_month = models.PositiveSmallIntegerField()
    start_date = models.DateField()
    # First day of the last month whose occurrence was materialized; never moves back.
    materialized_through = models.DateField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0), name="recurring_payment_amount_positive"
            ),
            models.CheckConstraint(
                condition=Q(day_of_month__gte=1, day_of_month__lte=31),
                name="recurring_payment_day_in_month",
            ),
            models.CheckConstraint(
                condition=Q(category_id__in=CATEGORY_IDS),
                name="recurring_payment_category_in_catalog",
            ),
        ]


class RecurringPaymentOccurrence(models.Model):
    """The reservation of one rule in one month, with a copy of what the rule said then."""

    class Status(models.TextChoices):
        PENDING = "pending"
        CONFIRMED = "confirmed"
        CANCELLED = "cancelled"

    user_id = models.PositiveBigIntegerField(db_index=True)
    # Kept for the audit trail; a rule with occurrences is soft-deleted, never removed.
    recurring_payment = models.ForeignKey(
        RecurringPayment, on_delete=models.PROTECT, related_name="occurrences"
    )
    # First day of the month the occurrence belongs to.
    month = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="occurrences")
    category_id = models.PositiveSmallIntegerField()
    description = models.CharField(max_length=DESCRIPTION_MAX_LENGTH, blank=True)
    due_date = models.DateField()
    # The day the reservation starts to count: its month's first day, or the rule's start.
    reserved_from = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    # When the resolution takes effect, and when the User registered it.
    resolved_on = models.DateField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    # What the User confirmed; the reserved amount and Account above never change.
    resolved_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    resolved_account = models.ForeignKey(
        Account, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    # Not a foreign key: the link survives the deletion of the Expense (audit trail).
    expense_id = models.PositiveBigIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-due_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["recurring_payment", "month"], name="occurrence_once_per_rule_and_month"
            ),
            models.CheckConstraint(
                condition=Q(amount__gt=0), name="occurrence_amount_positive"
            ),
        ]
        indexes = [models.Index(fields=["user_id", "status"], name="occurrence_user_status")]
