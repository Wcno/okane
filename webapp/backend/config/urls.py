from django.urls import path, re_path

from gateway.views import forward
from health.views import health
from spa.views import entry_page
from users import views as auth

# Prefixes owned by the backend (docs/matrices.md). A request under one of them
# is answered by a backend view or with 404, never with the frontend.
BACKEND_PREFIXES = ("api", "auth", "users", "internal", "health")
CLIENT_SIDE_ROUTE = rf"^(?!(?:{'|'.join(BACKEND_PREFIXES)})(?:/|$))"

urlpatterns = [
    path("health", health),
    path("auth/session", auth.session),
    path("users/me", auth.delete_me),
    path("auth/register", auth.register),
    path("auth/login", auth.login_view),
    path("auth/logout", auth.logout_view),
    path("auth/forgot-password", auth.forgot_password),
    path("auth/reset-password", auth.reset_password),
    path("auth/password", auth.change_password),
    re_path(r"^api/", forward),
    re_path(CLIENT_SIDE_ROUTE, entry_page),
]
