import hmac
import re

from django.conf import settings
from django.http import JsonResponse

SERVICE_KEY_HEADER = "X-Okane-Service-Key"
USER_ID_HEADER = "X-Okane-User-Id"

# Readiness is the one public read; it exposes no user data (docs/contratos.md).
PUBLIC_PATHS = frozenset({"/api/health"})

# webapp sends the primary key of the User as plain ASCII digits.
USER_ID = re.compile(r"[1-9][0-9]*", re.ASCII)


class ServiceCredentialMiddleware:
    """Reject requests that webapp did not build, even on the internal network.

    Every other request carries the User that webapp authenticated; views read
    it from `request.okane_user_id` and scope every query to it.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.okane_user_id = None
        if request.path in PUBLIC_PATHS:
            return self.get_response(request)
        if not self.is_from_webapp(request):
            return JsonResponse({"detail": "invalid_service_credential"}, status=403)
        user_id = request.headers.get(USER_ID_HEADER, "")
        if not USER_ID.fullmatch(user_id):
            return JsonResponse({"detail": "invalid_user_identity"}, status=403)
        request.okane_user_id = int(user_id)
        return self.get_response(request)

    @staticmethod
    def is_from_webapp(request):
        presented = request.headers.get(SERVICE_KEY_HEADER, "")
        expected = settings.INTERNAL_SERVICE_KEY
        # Without a configured key nobody is webapp: never match empty to empty.
        return bool(expected) and hmac.compare_digest(
            presented.encode(), expected.encode()
        )
