"""Settings for webapp, the only public entry point (ADR 0001).

Every deployment value comes from the environment; see `.env.example` at the
repository root.
"""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from config.https import https_settings

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

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "users",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
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

# Users live in webapp-db and sign in with their email (docs/contratos.md,
# "Acceso, sesiones y límites de uso").
AUTH_USER_MODEL = "users.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# A session ends after SESSION_IDLE_DAYS without use: every request renews it.
SESSION_COOKIE_AGE = int(env("SESSION_IDLE_DAYS", "14")) * 24 * 60 * 60
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
# The frontend reads the CSRF token from /auth/session, so no cookie needs to
# be readable from JavaScript.
CSRF_COOKIE_HTTPONLY = True
CSRF_FAILURE_VIEW = "users.views.csrf_failure"
CSRF_COOKIE_SAMESITE = "Lax"
# HTTPS through a TLS-terminating proxy: see config/https.py.
globals().update(https_settings(env("DJANGO_HTTPS", "false").lower() == "true"))

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Panama"
USE_I18N = True
USE_TZ = True

# The built frontend. WhiteNoise serves its files; client-side routes fall back
# to its entry page (spa.views).
WHITENOISE_ROOT = Path(env("FRONTEND_DIST", str(BASE_DIR.parent / "frontend" / "dist")))
