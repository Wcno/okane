from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from config.rest import paginate
from transfers.models import Transfer
from transfers.serializers import TransferSerializer


def owned_transfer(request, transfer_id, lock=False):
    """The User's Transfer; another User's id is as absent as an unknown one."""
    transfers = Transfer.objects.filter(user_id=request.okane_user_id, pk=transfer_id)
    transfer = (transfers.select_for_update() if lock else transfers).first()
    if transfer is None:
        raise NotFound
    return transfer


@api_view(["GET", "POST"])
@transaction.atomic
def transfer_collection(request):
    user_id = request.okane_user_id
    if request.method == "POST":
        serializer = TransferSerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        return Response(TransferSerializer(serializer.save()).data, status=201)
    transfers, page = paginate(request, Transfer.objects.filter(user_id=user_id))
    return Response({"results": TransferSerializer(transfers, many=True).data, **page})


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def transfer_detail(request, transfer_id):
    transfer = owned_transfer(request, transfer_id, lock=request.method != "GET")
    if request.method == "PUT":
        serializer = TransferSerializer(
            transfer, data=request.data, context={"user_id": request.okane_user_id}
        )
        serializer.is_valid(raise_exception=True)
        return Response(TransferSerializer(serializer.save()).data)
    if request.method == "DELETE":
        transfer.delete()
        return Response(status=204)
    return Response(TransferSerializer(transfer).data)
