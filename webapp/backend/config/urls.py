from django.urls import path, re_path

from gateway.views import forward
from health.views import health
from spa.views import entry_page

# Prefixes owned by the backend (docs/matrices.md). A request under one of them
# is answered by a backend view or with 404, never with the frontend.
BACKEND_PREFIXES = ("api", "auth", "users", "health")
CLIENT_SIDE_ROUTE = rf"^(?!(?:{'|'.join(BACKEND_PREFIXES)})(?:/|$))"

urlpatterns = [
    path("health", health),
    re_path(r"^api/", forward),
    re_path(CLIENT_SIDE_ROUTE, entry_page),
]
