from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.views.decorators.http import require_safe

SERVICE_NAME = "webapp"


def database_is_reachable():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return False
    return True


@require_safe
def health(request):
    """Public readiness check for webapp itself: no user data, no configuration.

    The readiness of api-service is read through `/api/health`.
    """
    if database_is_reachable():
        return JsonResponse({"status": "ok", "service": SERVICE_NAME, "database": "ok"})
    return JsonResponse(
        {"status": "unavailable", "service": SERVICE_NAME, "database": "unavailable"},
        status=503,
    )
