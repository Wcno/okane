import datetime
import re
from decimal import Decimal

from rest_framework import serializers

from accounts.serializers import AMOUNT_LIMIT, DecimalStringField, amount_messages, messages
from budgets.models import Budget
from categories import rules as category_rules
from expenses.serializers import StrictIntegerField

AMOUNT_INVALID = (
    "Escribe un presupuesto mayor que cero, con dos decimales como máximo. Ejemplo: 300.00"
)
AMOUNT_TOO_LARGE = f"El presupuesto es demasiado grande. El máximo es ${AMOUNT_LIMIT}."
CATEGORY_INVALID = "Elige la Categoría del presupuesto."
CATEGORY_IS_ARCHIVED = "Esta Categoría está archivada y no admite registros nuevos. Elige otra."
MONTH_INVALID = "Elige el mes del presupuesto, por ejemplo 2026-11."
BUDGET_EXISTS = "Esta Categoría ya tiene un presupuesto en ese mes. Edita el existente."

MONTH_PATTERN = re.compile(r"\d{4}-(0[1-9]|1[0-2])")


def parse_month(text):
    """The first day of a `YYYY-MM` month, or None when the text is not one."""
    if not isinstance(text, str) or not MONTH_PATTERN.fullmatch(text):
        return None
    try:
        return datetime.date.fromisoformat(f"{text}-01")
    except ValueError:
        return None


class MonthField(serializers.Field):
    """A calendar month written `YYYY-MM`, held as its first day."""

    default_error_messages = {"invalid": MONTH_INVALID}

    def to_internal_value(self, data):
        month = parse_month(data)
        if month is None:
            self.fail("invalid")
        return month

    def to_representation(self, value):
        return value.strftime("%Y-%m")


class BudgetSerializer(serializers.Serializer):
    """Validates a Budget; `context["user_id"]` is the User webapp authenticated.

    Another User's Category is as absent as an unknown one, and an archived one
    is refused for a new Budget. A second Budget for the same Category and
    month is refused by the database, which holds under concurrency.
    """

    amount = DecimalStringField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
        error_messages=amount_messages(AMOUNT_INVALID, AMOUNT_TOO_LARGE),
    )
    category_id = StrictIntegerField(
        error_messages=messages(CATEGORY_INVALID, "required", "null", "invalid"),
    )
    month = MonthField(error_messages=messages(MONTH_INVALID, "required", "null"))

    def validate_category_id(self, value):
        return category_rules.assignable(
            self.context["user_id"],
            value,
            unchanged_from=self.instance.category_id if self.instance else None,
            archived=CATEGORY_IS_ARCHIVED,
        )

    def create(self, validated_data):
        return Budget.objects.create(user_id=self.context["user_id"], **validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
