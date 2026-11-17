import httpx
from django.conf import settings

SERVICE_KEY_HEADER = "X-Okane-Service-Key"
USER_ID_HEADER = "X-Okane-User-Id"

api_service = httpx.Client(timeout=10)


def service_headers(headers, user_id=None):
    """Add the service credential, and the User's identity when a User is given."""
    headers[SERVICE_KEY_HEADER] = settings.INTERNAL_SERVICE_KEY
    if user_id is not None:
        headers[USER_ID_HEADER] = str(user_id)
    return headers
