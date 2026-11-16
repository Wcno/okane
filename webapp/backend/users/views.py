"""Session authentication for the browser application (docs/matrices.md).

Every response carries the current CSRF token: the cookie is HttpOnly, so the
frontend reads the token here and sends it back in `X-CSRFToken`.
"""

import json

from django.contrib.auth import authenticate, login, logout, password_validation
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_POST, require_safe

from users import throttling
from users.models import User, normalize_email

INVALID_EMAIL = "Escribe un correo válido, por ejemplo ana@ejemplo.com."
MISSING_PASSWORD = "Escribe una contraseña de al menos 10 caracteres."
EMAIL_TAKEN = (
    "Ya existe un usuario con este correo. Inicia sesión o regístrate con otro correo."
)
UNREADABLE_REQUEST = "No pudimos leer los datos enviados. Recarga la página e inténtalo de nuevo."
WRONG_CREDENTIALS = "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo."
TOO_MANY_ATTEMPTS = (
    "Hubo demasiados intentos fallidos. Por seguridad, espera hasta 15 minutos "
    "y vuelve a intentarlo."
)
EXPIRED_FORM = (
    "No pudimos confirmar que el envío venga de esta página. "
    "Recarga la página e inténtalo de nuevo."
)


def session_state(request, status=200):
    user = request.user
    return JsonResponse(
        {
            "user": {"id": user.pk, "email": user.email} if user.is_authenticated else None,
            "csrf_token": get_token(request),
        },
        status=status,
    )


def validation_errors(errors, status=400):
    return JsonResponse({"errors": errors}, status=status)


def read_credentials(request):
    """Return the email and password sent as JSON, or None if unreadable."""
    try:
        data = json.loads(request.body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    email, password = data.get("email", ""), data.get("password", "")
    if not isinstance(email, str) or not isinstance(password, str):
        return None
    return normalize_email(email), password


@require_safe
def session(request):
    return session_state(request)


@require_POST
def register(request):
    credentials = read_credentials(request)
    if credentials is None:
        return validation_errors({"form": [UNREADABLE_REQUEST]})
    email, password = credentials

    errors = {}
    try:
        validate_email(email)
    except ValidationError:
        errors["email"] = [INVALID_EMAIL]
    if not password:
        errors["password"] = [MISSING_PASSWORD]
    else:
        try:
            password_validation.validate_password(password, User(email=email))
        except ValidationError as error:
            errors["password"] = list(error.messages)
    if errors:
        return validation_errors(errors)

    try:
        with transaction.atomic():
            user = User.objects.create_user(email, password)
    except IntegrityError:
        return validation_errors({"email": [EMAIL_TAKEN]})
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return session_state(request, status=201)


@require_POST
def login_view(request):
    credentials = read_credentials(request)
    if credentials is None:
        return validation_errors({"form": [UNREADABLE_REQUEST]})
    email, password = credentials
    origin = request.META["REMOTE_ADDR"]

    wait = throttling.seconds_until_allowed(email, origin)
    if wait:
        response = validation_errors({"form": [TOO_MANY_ATTEMPTS]}, status=429)
        response["Retry-After"] = str(wait)
        return response

    # authenticate() hashes the password even for an unknown email, so both
    # failures take the same time and get the same answer.
    user = authenticate(request, email=email, password=password)
    if user is None:
        throttling.record_failure(email, origin)
        return validation_errors({"form": [WRONG_CREDENTIALS]})
    throttling.clear_failures(email, origin)
    login(request, user)
    return session_state(request)


@require_POST
def logout_view(request):
    # Deleting the stored session cuts every copy of its cookie at once.
    logout(request)
    return HttpResponse(status=204)


def csrf_failure(request, reason=""):
    return validation_errors({"form": [EXPIRED_FORM]}, status=403)
