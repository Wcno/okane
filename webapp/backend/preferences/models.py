from django.conf import settings
from django.db import models

MOVEMENT_TYPES = ("expense", "income", "transfer", "buy", "sell", "dividend")
PERIODS = ("current_month", "all", "custom")
GROUPINGS = ("date", "type")
# What the Panel can show, in display order (docs/contratos.md).
DASHBOARD_SECTIONS = ("available", "budgets", "net_worth", "upcoming", "accounts")


class UserPreferences(models.Model):
    """What one User chose for the Movements view and the Panel; deleted with the User."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="preferences"
    )
    movement_type = models.CharField(max_length=8, blank=True, default="")
    # An Account of api-service: only its id is kept, checked when it is saved.
    account_id = models.PositiveBigIntegerField(null=True, blank=True)
    period = models.CharField(max_length=13, default="current_month")
    period_from = models.DateField(null=True, blank=True)
    period_to = models.DateField(null=True, blank=True)
    grouping = models.CharField(max_length=4, default="date")
    # Hidden rather than visible, so a section added later shows by default.
    hidden_sections = models.JSONField(default=list)

    class Meta:
        db_table = "user_preferences"
