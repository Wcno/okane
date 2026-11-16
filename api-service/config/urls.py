from django.urls import path

from health.views import health

# Paths match the ones webapp exposes, so forwarding never rewrites them.
urlpatterns = [
    path("api/health", health),
]
