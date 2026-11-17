from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from accounts import clock
from accounts.dates import spanish_day
from config.rest import paginate
from expenses.serializers import ExpenseSerializer
from recurring_payments import reservations
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence
from recurring_payments.serializers import (
    DATE_BEFORE_RESERVATION,
    RecurringPaymentSerializer,
    represent_occurrence,
    represent_rules,
)

Status = RecurringPaymentOccurrence.Status

CONFIRM_CONFLICT = "Este pago ya se confirmó con otros datos. Revisa el Gasto registrado."
CONFIRM_CANCELLED = "Este pago ya se canceló y no se puede confirmar."
CANCEL_CONFIRMED = "Este pago ya se confirmó y no se puede cancelar."


def visible_rules(user_id):
    """Active rules, plus deleted ones whose pending occurrences still need resolving."""
    pending = RecurringPaymentOccurrence.objects.filter(
        recurring_payment=OuterRef("pk"), status=Status.PENDING
    )
    return RecurringPayment.objects.filter(user_id=user_id).filter(
        Q(deleted_at__isnull=True) | Exists(pending)
    )


def owned_rule(request, rule_id):
    """Lock the User's active rule; another User's id is as absent as an unknown one."""
    rule = (
        RecurringPayment.objects.select_for_update()
        .filter(user_id=request.okane_user_id, pk=rule_id, deleted_at__isnull=True)
        .first()
    )
    if rule is None:
        raise NotFound
    return rule


def owned_occurrence(request, occurrence_id, lock=False):
    occurrences = RecurringPaymentOccurrence.objects.filter(
        user_id=request.okane_user_id, pk=occurrence_id
    )
    occurrence = (occurrences.select_for_update() if lock else occurrences).first()
    if occurrence is None:
        raise NotFound
    return occurrence


def conflict(message):
    return Response({"errors": {"form": [message]}}, status=409)


@api_view(["GET", "POST"])
@transaction.atomic
def rule_collection(request):
    user_id = request.okane_user_id
    if request.method == "POST":
        serializer = RecurringPaymentSerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        rule = serializer.save()
        reservations.materialize(user_id)
        return Response(represent_rules([rule])[0], status=201)
    reservations.materialize(user_id)
    rules, page = paginate(request, visible_rules(user_id))
    return Response({"results": represent_rules(rules), **page})


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def rule_detail(request, rule_id):
    user_id = request.okane_user_id
    # What is due under the current rule is created before the rule can change.
    reservations.materialize(user_id)
    if request.method == "GET":
        rule = visible_rules(user_id).filter(pk=rule_id).first()
        if rule is None:
            raise NotFound
        return Response(represent_rules([rule])[0])

    rule = owned_rule(request, rule_id)
    if request.method == "PUT":
        serializer = RecurringPaymentSerializer(
            rule, data=request.data, context={"user_id": user_id}
        )
        serializer.is_valid(raise_exception=True)
        return Response(represent_rules([serializer.save()])[0])
    # Occurrences already created are history; the rule only stops producing new ones.
    if rule.occurrences.exists():
        rule.deleted_at = timezone.now()
        rule.save(update_fields=["deleted_at"])
    else:
        rule.delete()
    return Response(status=204)


@api_view(["GET"])
@transaction.atomic
def occurrence_detail(request, occurrence_id):
    reservations.materialize(request.okane_user_id)
    return Response(represent_occurrence(owned_occurrence(request, occurrence_id)))


def same_confirmation(occurrence, data):
    """Whether a repeated confirmation names what was confirmed; omitted fields match."""
    if "amount" in data:
        try:
            if Decimal(str(data["amount"])) != occurrence.resolved_amount:
                return False
        except InvalidOperation:
            return False
    if "account_id" in data and data["account_id"] != occurrence.resolved_account_id:
        return False
    return "date" not in data or data["date"] == occurrence.resolved_on.isoformat()


@api_view(["POST"])
@transaction.atomic
def occurrence_confirm(request, occurrence_id):
    occurrence = owned_occurrence(request, occurrence_id, lock=True)
    data = request.data if isinstance(request.data, dict) else {}

    if occurrence.status == Status.CONFIRMED:
        if same_confirmation(occurrence, data):
            return Response(represent_occurrence(occurrence))
        return conflict(CONFIRM_CONFLICT)
    if occurrence.status == Status.CANCELLED:
        return conflict(CONFIRM_CANCELLED)

    # The Expense goes through the same validation and ledger as any other Expense.
    serializer = ExpenseSerializer(
        data={
            "amount": data.get("amount", f"{occurrence.amount:.2f}"),
            "account_id": data.get("account_id", occurrence.account_id),
            "date": data.get("date", clock.today().isoformat()),
            "category_id": occurrence.category_id,
            "description": occurrence.description,
        },
        context={"user_id": request.okane_user_id},
    )
    serializer.is_valid(raise_exception=True)
    if serializer.validated_data["date"] < occurrence.reserved_from:
        message = DATE_BEFORE_RESERVATION.format(entered=spanish_day(occurrence.reserved_from))
        raise ValidationError({"date": [message]})
    expense = serializer.save()

    occurrence.status = Status.CONFIRMED
    occurrence.resolved_on = expense.date
    occurrence.resolved_at = timezone.now()
    occurrence.resolved_amount = expense.amount
    occurrence.resolved_account_id = expense.account_id
    occurrence.expense_id = expense.id
    occurrence.save()
    return Response(represent_occurrence(occurrence))


@api_view(["POST"])
@transaction.atomic
def occurrence_cancel(request, occurrence_id):
    occurrence = owned_occurrence(request, occurrence_id, lock=True)
    if occurrence.status == Status.CONFIRMED:
        return conflict(CANCEL_CONFIRMED)
    if occurrence.status == Status.PENDING:
        occurrence.status = Status.CANCELLED
        occurrence.resolved_on = clock.today()
        occurrence.resolved_at = timezone.now()
        occurrence.save()
    return Response(represent_occurrence(occurrence))
