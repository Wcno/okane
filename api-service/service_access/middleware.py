import hmac

from django.conf import settings
from django.http import JsonResponse

SERVICE_KEY_HEADER = "X-Okane-Service-Key"

# Readiness is the one public read; it exposes no user data (docs/contratos.md).
PUBLIC_PATHS = frozenset({"/api/health"})


class ServiceCredentialMiddleware:
    """Reject requests that webapp did not build, even on the internal network."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path not in PUBLIC_PATHS and not self.is_from_webapp(request):
            return JsonResponse({"detail": "invalid_service_credential"}, status=403)
        return self.get_response(request)

    @staticmethod
    def is_from_webapp(request):
        presented = request.headers.get(SERVICE_KEY_HEADER, "")
        expected = settings.INTERNAL_SERVICE_KEY
        return hmac.compare_digest(presented.encode(), expected.encode())
