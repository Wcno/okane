from decimal import Decimal

from django.db.models import Q
from rest_framework import serializers
from rest_framework.exceptions import NotFound

from accounts import clock
from accounts.models import Account
from accounts.serializers import DecimalStringField, amount_messages, messages
from categories import rules as category_rules
from expenses.models import DESCRIPTION_MAX_LENGTH
from expenses.serializers import (
    ACCOUNT_IS_ARCHIVED,
    ACCOUNT_IS_INVESTMENT,
    ACCOUNT_REQUIRED,
    AMOUNT_INVALID,
    AMOUNT_TOO_LARGE,
    CATEGORY_INVALID,
    CATEGORY_IS_ARCHIVED,
    DESCRIPTION_NOT_TEXT,
    DESCRIPTION_TOO_LONG,
    StrictIntegerField,
)
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence

START_DATE_INVALID = "Escribe la fecha de inicio del pago, por ejemplo 2026-12-01."
DAY_INVALID = "Elige el día del mes en que vence el pago, de 1 a 31."
DATE_BEFORE_RESERVATION = "La fecha no puede ser anterior a la entrada de la reserva ({entered})."


class RecurringPaymentSerializer(serializers.Serializer):
    """Validates a rule; `context["user_id"]` is the User webapp authenticated.

    The Account is looked up among the User's own and locked, like an Expense's.
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
    account_id = StrictIntegerField(
        error_messages=messages(ACCOUNT_REQUIRED, "required", "null", "invalid"),
    )
    day_of_month = StrictIntegerField(
        min_value=1,
        max_value=31,
        error_messages=messages(
            DAY_INVALID, "required", "null", "invalid", "min_value", "max_value"
        ),
    )
    start_date = serializers.DateField(
        error_messages=messages(START_DATE_INVALID, "required", "null", "invalid", "datetime"),
    )
    description = serializers.CharField(
        max_length=DESCRIPTION_MAX_LENGTH,
        required=False,
        allow_blank=True,
        error_messages={
            **messages(DESCRIPTION_NOT_TEXT, "invalid", "null"),
            "max_length": DESCRIPTION_TOO_LONG,
        },
    )

    def validate_category_id(self, value):
        return category_rules.assignable(
            self.context["user_id"],
            value,
            unchanged_from=self.instance.category_id if self.instance else None,
            archived=CATEGORY_IS_ARCHIVED,
        )

    def validate_account_id(self, value):
        account = (
            Account.objects.select_for_update()
            .filter(user_id=self.context["user_id"], pk=value)
            .first()
        )
        if account is None:
            raise NotFound
        return account

    def validate(self, data):
        account = data.pop("account_id")
        # A rule that stays on an Account archived since is not a new operation.
        stays = self.instance is not None and self.instance.account_id == account.id
        if not stays:
            if account.type == Account.Type.INVESTMENT:
                raise serializers.ValidationError({"account_id": [ACCOUNT_IS_INVESTMENT]})
            if account.archived_at is not None:
                raise serializers.ValidationError({"account_id": [ACCOUNT_IS_ARCHIVED]})
        data["account"] = account
        return data

    def create(self, validated_data):
        return RecurringPayment.objects.create(user_id=self.context["user_id"], **validated_data)

    def update(self, instance, validated_data):
        validated_data.setdefault("description", "")
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


def occurrence_status(occurrence):
    """`overdue` is a pending occurrence past its due date; it stays committed."""
    if (
        occurrence.status == RecurringPaymentOccurrence.Status.PENDING
        and occurrence.due_date < clock.today()
    ):
        return "overdue"
    return occurrence.status


def represent_occurrence(occurrence):
    confirmed = occurrence.status == RecurringPaymentOccurrence.Status.CONFIRMED
    return {
        "id": occurrence.id,
        "recurring_payment_id": occurrence.recurring_payment_id,
        "due_date": occurrence.due_date.isoformat(),
        "status": occurrence_status(occurrence),
        "amount": f"{occurrence.amount:.2f}",
        "account_id": occurrence.account_id,
        "category_id": occurrence.category_id,
        "description": occurrence.description,
        "reserved_from": occurrence.reserved_from.isoformat(),
        # The day the Expense was registered at; null until the occurrence is confirmed.
        "entered_on": occurrence.resolved_on.isoformat() if confirmed else None,
        "resolved_on": occurrence.resolved_on.isoformat() if occurrence.resolved_on else None,
        "resolved_at": occurrence.resolved_at.isoformat() if occurrence.resolved_at else None,
        "expense_id": occurrence.expense_id,
    }


def represent_rules(rules):
    """Rules with their pending, overdue and current-month occurrences, newest due first."""
    this_month = clock.today().replace(day=1)
    by_rule = {rule.id: [] for rule in rules}
    shown = RecurringPaymentOccurrence.objects.filter(
        recurring_payment_id__in=by_rule
    ).filter(Q(status=RecurringPaymentOccurrence.Status.PENDING) | Q(month=this_month))
    for occurrence in shown.order_by("-due_date", "-id"):
        by_rule[occurrence.recurring_payment_id].append(represent_occurrence(occurrence))
    return [
        {
            "id": rule.id,
            "description": rule.description,
            "amount": f"{rule.amount:.2f}",
            "account_id": rule.account_id,
            "category_id": rule.category_id,
            "day_of_month": rule.day_of_month,
            "start_date": rule.start_date.isoformat(),
            "status": "deleted" if rule.deleted_at else "active",
            "occurrences": by_rule[rule.id],
        }
        for rule in rules
    ]

