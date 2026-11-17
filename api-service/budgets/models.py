from django.db import models
from django.db.models import Q


class Budget(models.Model):
    """The limit a User sets for one Category in one calendar month (GLOSSARY.md, Presupuesto)."""

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField()
    category = models.ForeignKey("categories.Category", on_delete=models.PROTECT, related_name="+")
    # First day of the month the Budget limits.
    month = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["category_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user_id", "category_id", "month"], name="budget_one_per_category_month"
            ),
            models.CheckConstraint(condition=Q(amount__gt=0), name="budget_amount_positive"),
            models.CheckConstraint(condition=Q(month__day=1), name="budget_month_is_first_day"),
        ]
