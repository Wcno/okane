import httpx
from django.conf import settings

from gateway.upstream import api_service, service_headers

# Reached only from webapp's own code; no browser route forwards to it.
ERASURE_PATH = "/internal/users/me"
ERASURE_ATTEMPTS = 2


def erase_financial_data(user_id):
    """Ask api-service to delete the User's financial data; True once it confirms.

    The call is idempotent, so any answer other than a confirmed 204, or no
    answer at all, is settled by repeating it once.
    """
    url = settings.API_SERVICE_URL + ERASURE_PATH
    for _ in range(ERASURE_ATTEMPTS):
        try:
            answer = api_service.delete(url, headers=service_headers({}, user_id))
        except httpx.TransportError:
            continue
        if answer.status_code == 204:
            return True
    return False
