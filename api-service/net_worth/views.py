from rest_framework.decorators import api_view
from rest_framework.response import Response

from net_worth.history import history_of


@api_view(["GET"])
def net_worth_history(request):
    return Response(history_of(request.okane_user_id))
