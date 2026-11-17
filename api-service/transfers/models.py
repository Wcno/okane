from django.db import models
from django.db.models import F, Q

from accounts.models import Account

DESCRIPTION_MAX_LENGTH = 140


class Transfer(models.Model):
    """Money moved between two Accounts of one User (GLOSSARY.md, Transferencia).

    One row is both sides of the movement, so the two Balances can never
    disagree: no Category, no Budget, and the total of the Balances is unchanged.
    """

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField()
    # An Account with Transfers is archived, never deleted (ADR 0002).
    source_account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="transfers_out"
    )
    destination_account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="transfers_in"
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField()
    description = models.CharField(max_length=DESCRIPTION_MAX_LENGTH, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        indexes = [models.Index(fields=["user_id", "-date", "-id"], name="transfer_user_feed")]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="transfer_amount_positive"),
            models.CheckConstraint(
                condition=~Q(source_account=F("destination_account")),
                name="transfer_between_two_accounts",
            ),
        ]
