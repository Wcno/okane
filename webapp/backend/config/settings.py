"""Settings for webapp, the only public entry point (ADR 0001).

Every deployment value comes from the environment; see `.env.example` at the
repository root.
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
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# Where api-service listens on the internal network, and the shared credential
# that proves a forwarded request was built here.
API_SERVICE_URL = env("API_SERVICE_URL", "http://api-service:8000")
INTERNAL_SERVICE_KEY = env("INTERNAL_SERVICE_KEY")

INSTALLED_APPS = []

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DATABASE_NAME", "okane_webapp"),
        "USER": env("DATABASE_USER", "okane_webapp"),
        "PASSWORD": env("DATABASE_PASSWORD", ""),
        "HOST": env("DATABASE_HOST", "localhost"),
        "PORT": env("DATABASE_PORT", "5432"),
        "OPTIONS": {"connect_timeout": 3},
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Panama"
USE_I18N = True
USE_TZ = True

# The built frontend. WhiteNoise serves its files; client-side routes fall back
# to its entry page (spa.views).
WHITENOISE_ROOT = Path(env("FRONTEND_DIST", str(BASE_DIR.parent / "frontend" / "dist")))
