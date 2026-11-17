"""Settings for api-service, the internal financial API.

Every deployment value comes from the environment; see `.env.example` at the
repository root. The service is reachable only from `webapp` (ADR 0001).
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name, default=None):
    # An empty value counts as unset, so a blank secret can never be accepted.
    value = os.environ.get(name) or default
    if value is None:
        raise ImproperlyConfigured(f"Set the {name} environment variable.")
    return value


SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = False
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS", "api-service,localhost,127.0.0.1").split(",")

# Shared credential that proves a request was built by webapp.
INTERNAL_SERVICE_KEY = env("INTERNAL_SERVICE_KEY")

INSTALLED_APPS = [
    "rest_framework",
    "health",
    "accounts",
    "expenses",
    "transfers",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "service_access.middleware.ServiceCredentialMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DATABASE_NAME", "okane_api"),
        "USER": env("DATABASE_USER", "okane_api"),
        "PASSWORD": env("DATABASE_PASSWORD", ""),
        "HOST": env("DATABASE_HOST", "localhost"),
        "PORT": env("DATABASE_PORT", "5432"),
        "OPTIONS": {"connect_timeout": 3},
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# webapp owns users and sessions; this service never authenticates people.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "config.rest.exception_handler",
}

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Panama"
USE_I18N = True
USE_TZ = True
