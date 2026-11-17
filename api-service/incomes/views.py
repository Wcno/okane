from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from config.rest import paginate
from incomes.models import Income
from incomes.serializers import IncomeSerializer


def owned_income(request, income_id, lock=False):
    """The User's Income; another User's id is as absent as an unknown one."""
    incomes = Income.objects.filter(user_id=request.okane_user_id, pk=income_id)
    income = (incomes.select_for_update() if lock else incomes).first()
    if income is None:
        raise NotFound
    return income


@api_view(["GET", "POST"])
@transaction.atomic
def income_collection(request):
    user_id = request.okane_user_id
    if request.method == "POST":
        serializer = IncomeSerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        return Response(IncomeSerializer(serializer.save()).data, status=201)
    incomes, page = paginate(request, Income.objects.filter(user_id=user_id))
    return Response({"results": IncomeSerializer(incomes, many=True).data, **page})


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def income_detail(request, income_id):
    income = owned_income(request, income_id, lock=request.method != "GET")
    if request.method == "PUT":
        serializer = IncomeSerializer(
            income, data=request.data, context={"user_id": request.okane_user_id}
        )
        serializer.is_valid(raise_exception=True)
        return Response(IncomeSerializer(serializer.save()).data)
    if request.method == "DELETE":
        income.delete()
        return Response(status=204)
    return Response(IncomeSerializer(income).data)
