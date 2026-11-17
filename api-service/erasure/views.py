from django.http import HttpResponse
from django.views.decorators.http import require_http_methods

from erasure.service import erase_user_data


@require_http_methods(["DELETE"])
def erase_current_user(request):
    erase_user_data(request.okane_user_id)
    return HttpResponse(status=204)
