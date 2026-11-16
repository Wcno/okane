from django.db import DatabaseError, connection
from rest_framework.decorators import api_view
from rest_framework.response import Response

SERVICE_NAME = "api-service"


def database_is_reachable():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return False
    return True


@api_view(["GET"])
def health(request):
    """Public readiness check: no user data and no configuration."""
    if database_is_reachable():
        return Response({"status": "ok", "service": SERVICE_NAME, "database": "ok"})
    return Response(
        {"status": "unavailable", "service": SERVICE_NAME, "database": "unavailable"},
        status=503,
    )
