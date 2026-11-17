from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from config.rest import paginate
from expenses.models import Expense
from expenses.serializers import ExpenseSerializer


def last_used_account_id(user_id):
    """The Account of the Expense registered last, by creation order, not by date."""
    return (
        Expense.objects.filter(user_id=user_id)
        .order_by("-id")
        .values_list("account_id", flat=True)
        .first()
    )


def represent(expenses, user_id, many=False):
    """Expenses as JSON, each with the occurrence that confirmed it (null for the rest)."""
    # Imported here: recurring_payments builds on expenses, so a module import would be circular.
    from recurring_payments.models import RecurringPaymentOccurrence

    ids = [expense.id for expense in expenses] if many else [expenses.id]
    occurrence_ids = dict(
        RecurringPaymentOccurrence.objects.filter(user_id=user_id, expense_id__in=ids).values_list(
            "expense_id", "id"
        )
    )
    return ExpenseSerializer(expenses, many=many, context={"occurrence_ids": occurrence_ids}).data


def owned_expense(request, expense_id, lock=False):
    """The User's Expense; another User's id is as absent as an unknown one."""
    expenses = Expense.objects.filter(user_id=request.okane_user_id, pk=expense_id)
    expense = (expenses.select_for_update() if lock else expenses).first()
    if expense is None:
        raise NotFound
    return expense


@api_view(["GET", "POST"])
@transaction.atomic
def expense_collection(request):
    user_id = request.okane_user_id
    if request.method == "POST":
        serializer = ExpenseSerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        return Response(represent(serializer.save(), user_id), status=201)
    expenses, page = paginate(request, Expense.objects.filter(user_id=user_id))
    return Response(
        {
            "results": represent(expenses, user_id, many=True),
            **page,
            "last_used_account_id": last_used_account_id(user_id),
        }
    )


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def expense_detail(request, expense_id):
    expense = owned_expense(request, expense_id, lock=request.method != "GET")
    if request.method == "PUT":
        serializer = ExpenseSerializer(
            expense, data=request.data, context={"user_id": request.okane_user_id}
        )
        serializer.is_valid(raise_exception=True)
        return Response(represent(serializer.save(), request.okane_user_id))
    if request.method == "DELETE":
        expense.delete()
        return Response(status=204)
    return Response(represent(expense, request.okane_user_id))
