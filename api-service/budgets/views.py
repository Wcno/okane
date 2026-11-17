from django.db import IntegrityError, transaction
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from accounts import clock
from budgets import month_copy, remaining
from budgets.models import Budget
from budgets.serializers import BUDGET_EXISTS, MONTH_INVALID, BudgetSerializer, parse_month
from recurring_payments import reservations, schedule


def owned_budget(request, budget_id, lock=False):
    """The User's Budget; another User's id is as absent as an unknown one."""
    budgets = Budget.objects.filter(user_id=request.okane_user_id, pk=budget_id)
    budget = (budgets.select_for_update() if lock else budgets).first()
    if budget is None:
        raise NotFound
    return budget


def requested_month(request):
    text = request.query_params.get("month")
    if text is None:
        return schedule.month_start(clock.today())
    month = parse_month(text)
    if month is None:
        raise ValidationError({"month": [MONTH_INVALID]})
    return month


def save_unique(serializer):
    """Save; a second Budget for one Category and month comes back as a conflict response."""
    try:
        with transaction.atomic():
            return serializer.save(), None
    except IntegrityError:
        return None, Response({"errors": {"form": [BUDGET_EXISTS]}}, status=409)


@api_view(["GET", "POST"])
@transaction.atomic
def budget_collection(request):
    user_id = request.okane_user_id
    if request.method == "POST":
        serializer = BudgetSerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        budget, conflict = save_unique(serializer)
        if conflict:
            return conflict
        if budget.month == month_copy.current_month():
            # A hand-made Budget personalizes the month, so it is marked without copying over it.
            month_copy.initialize_current_month(user_id)
        reservations.materialize(user_id)
        return Response(remaining.represent_budget(budget), status=201)
    month = requested_month(request)
    if month == month_copy.current_month():
        month_copy.initialize_current_month(user_id)
    reservations.materialize(user_id)
    return Response(
        {"month": month.strftime("%Y-%m"), "results": remaining.represent_month(user_id, month)}
    )


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def budget_detail(request, budget_id):
    user_id = request.okane_user_id
    budget = owned_budget(request, budget_id, lock=request.method != "GET")
    if request.method == "DELETE":
        budget.delete()
        return Response(status=204)
    if request.method == "PUT":
        serializer = BudgetSerializer(budget, data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        budget, conflict = save_unique(serializer)
        if conflict:
            return conflict
    reservations.materialize(user_id)
    return Response(remaining.represent_budget(budget))
