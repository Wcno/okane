from django.urls import path, re_path

from gateway.public_api import openapi, public_api
from gateway.views import forward
from preferences import views as preferences
from health.views import health
from spa.views import entry_page
from users import token_views
from users import views as auth

# Prefixes owned by the backend (docs/matrices.md). A request under one of them
# is answered by a backend view or with 404, never with the frontend.
BACKEND_PREFIXES = ("api", "auth", "users", "internal", "health")
CLIENT_SIDE_ROUTE = rf"^(?!(?:{'|'.join(BACKEND_PREFIXES)})(?:/|$))"

urlpatterns = [
    path("health", health),
    path("auth/session", auth.session),
    path("users/me", auth.delete_me),
    path("users/me/tokens", token_views.token_collection),
    path("users/me/tokens/<int:token_id>", token_views.token_detail),
    path("auth/register", auth.register),
    path("auth/login", auth.login_view),
    path("auth/logout", auth.logout_view),
    path("auth/forgot-password", auth.forgot_password),
    path("auth/reset-password", auth.reset_password),
    path("auth/password", auth.change_password),
    path("api/v1/openapi.json", openapi),
    re_path(r"^api/v1(?:/|$)", public_api),
    path("api/settings/preferences", preferences.preferences),
    re_path(r"^api/", forward),
    re_path(CLIENT_SIDE_ROUTE, entry_page),
]
