from django.db import transaction
from django.http import JsonResponse

from erasure.locks import lock_for_write

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
FINANCIAL_PREFIX = "/api/"


class ErasedUserWritesMiddleware:
    """Refuse writes of a User whose data was erased, even from an older session.

    The whole write runs under the User's shared lock, so a write that is
    already running finishes before erasing starts, and none starts after it.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.okane_user_id is None or not self.is_financial_write(request):
            return self.get_response(request)
        with transaction.atomic():
            if not lock_for_write(request.okane_user_id):
                return JsonResponse({"detail": "user_erased"}, status=409)
            return self.get_response(request)

    @staticmethod
    def is_financial_write(request):
        return request.path.startswith(FINANCIAL_PREFIX) and request.method not in SAFE_METHODS
