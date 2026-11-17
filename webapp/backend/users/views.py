"""Session authentication for the browser application (docs/matrices.md).

Every response carries the current CSRF token: the cookie is HttpOnly, so the
frontend reads the token here and sends it back in `X-CSRFToken`.
"""

import json

from django.contrib.auth import (
    authenticate,
    login,
    logout,
    password_validation,
    update_session_auth_hash,
)
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods, require_POST, require_safe

from gateway.erasure import erase_financial_data
from users import recovery, tokens
from users.models import User, normalize_email
from users.throttling import login_limit, recovery_limit

INVALID_EMAIL = "Escribe un correo válido, por ejemplo ana@ejemplo.com."
EMAIL_TAKEN = (
    "Ya existe un usuario con este correo. Inicia sesión o regístrate con otro correo."
)
UNREADABLE_REQUEST = "No pudimos leer los datos enviados. Recarga la página e inténtalo de nuevo."
WRONG_CREDENTIALS = "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo."
TOO_MANY_ATTEMPTS = (
    "Hubo demasiados intentos fallidos. Por seguridad, espera hasta 15 minutos "
    "y vuelve a intentarlo."
)
WRONG_PASSWORD = "La contraseña no coincide. Revísala e inténtalo de nuevo."
WRONG_CURRENT_PASSWORD = "La contraseña actual no coincide. Revísala e inténtalo de nuevo."
TOO_MANY_REQUESTS = (
    "Hubo demasiadas solicitudes seguidas. Por seguridad, espera hasta 15 minutos "
    "y vuelve a intentarlo."
)
RESET_LINK_UNUSABLE = (
    "Este enlace ya no sirve: se usó o caducó. Pide uno nuevo para restablecer tu contraseña."
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


def too_many_attempts(wait, message):
    response = validation_errors({"form": [message]}, status=429)
    response["Retry-After"] = str(wait)
    return response


def read_json_object(request):
    """Return the JSON object sent, or None if the body is anything else."""
    try:
        data = json.loads(request.body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def read_fields(request, *names):
    """Return the named text fields sent as JSON, or None if unreadable."""
    data = read_json_object(request)
    if data is None:
        return None
    values = [data.get(name, "") for name in names]
    if not all(isinstance(value, str) for value in values):
        return None
    return values


def read_credentials(request):
    """Return the email and password sent as JSON, or None if unreadable."""
    fields = read_fields(request, "email", "password")
    if fields is None:
        return None
    email, password = fields
    return normalize_email(email), password


def is_valid_email(email):
    try:
        # The field's validators check both the format and the column length.
        User._meta.get_field("email").run_validators(email)
    except ValidationError:
        return False
    return True


def password_errors(password, user):
    """Return why the password policy rejects this password for the User, if it does."""
    try:
        password_validation.validate_password(password, user)
    except ValidationError as error:
        return list(error.messages)
    return []


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
    if not is_valid_email(email):
        errors["email"] = [INVALID_EMAIL]
    invalid_password = password_errors(password, User(email=email))
    if invalid_password:
        errors["password"] = invalid_password
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

    wait = login_limit.seconds_until_allowed(email, origin)
    if wait:
        return too_many_attempts(wait, TOO_MANY_ATTEMPTS)

    # authenticate() hashes the password even for an unknown email, so both
    # failures take the same time and get the same answer.
    user = authenticate(request, email=email, password=password)
    if user is None:
        login_limit.record(email, origin)
        return validation_errors({"form": [WRONG_CREDENTIALS]})
    login_limit.clear(email, origin)
    login(request, user)
    return session_state(request)


@require_POST
def logout_view(request):
    # Deleting the stored session cuts every copy of its cookie at once.
    logout(request)
    return HttpResponse(status=204)


@require_POST
def forgot_password(request):
    fields = read_fields(request, "email")
    if fields is None:
        return validation_errors({"form": [UNREADABLE_REQUEST]})
    email = normalize_email(fields[0])
    if not is_valid_email(email):
        return validation_errors({"email": [INVALID_EMAIL]})

    # The limit and the answer are the same whether or not the email belongs
    # to a User.
    origin = request.META["REMOTE_ADDR"]
    wait = recovery_limit.seconds_until_allowed(email, origin)
    if wait:
        return too_many_attempts(wait, TOO_MANY_REQUESTS)
    recovery_limit.record(email, origin)
    user = User.objects.filter(email=email).first()
    recovery.queue_reset_link(user)
    return HttpResponse(status=204)


@require_POST
def reset_password(request):
    fields = read_fields(request, "token", "password")
    if fields is None:
        return validation_errors({"form": [UNREADABLE_REQUEST]})
    token, password = fields

    user = recovery.user_for_token(token)
    if user is None:
        return validation_errors({"form": [RESET_LINK_UNUSABLE]})
    errors = password_errors(password, user)
    if errors:
        return validation_errors({"password": errors})

    # The new hash ends every session of the User and the link itself, since
    # both are signed with the old one. This browser is signed out cleanly.
    previous_hash = user.password
    user.set_password(password)
    # Compare and replace atomically: concurrent requests may have validated
    # the same token, but only one can consume the original password hash.
    if not User.objects.filter(pk=user.pk, password=previous_hash).update(password=user.password):
        return validation_errors({"form": [RESET_LINK_UNUSABLE]})
    tokens.revoke_all(user)
    if request.user.pk == user.pk:
        logout(request)
    # Using a link is the correct attempt that restarts both counts: whoever
    # reads the mailbox may sign in, or ask again, without waiting.
    origin = request.META["REMOTE_ADDR"]
    login_limit.clear(user.email, origin)
    recovery_limit.clear(user.email, origin)
    return session_state(request)


@require_http_methods(["PUT"])
def change_password(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"detail": "authentication_required"}, status=401)
    fields = read_fields(request, "current_password", "new_password")
    if fields is None:
        return validation_errors({"form": [UNREADABLE_REQUEST]})
    current_password, new_password = fields

    if not user.check_password(current_password):
        return validation_errors({"current_password": [WRONG_CURRENT_PASSWORD]})
    errors = password_errors(new_password, user)
    if errors:
        return validation_errors({"new_password": errors})

    # The new hash ends every session of the User; this one is signed again.
    user.set_password(new_password)
    user.save(update_fields=["password"])
    tokens.revoke_all(user)
    update_session_auth_hash(request, user)
    return session_state(request)


@require_http_methods(["DELETE"])
def delete_me(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"detail": "authentication_required"}, status=401)
    fields = read_fields(request, "password")
    if fields is None:
        return validation_errors({"form": [UNREADABLE_REQUEST]})
    if not user.check_password(fields[0]):
        return validation_errors({"password": [WRONG_PASSWORD]})

    # Tokens stop working first, so nothing new is written while the data is erased.
    tokens.revoke_all(user)
    # The User stays until api-service confirms, so a failure can be retried.
    if not erase_financial_data(user.pk):
        return JsonResponse({"status": "unavailable", "service": "api-service"}, status=502)
    # Deleting the User ends every one of their sessions: a session whose User
    # no longer exists is anonymous.
    logout(request)
    user.delete()
    return HttpResponse(status=204)


def csrf_failure(request, reason=""):
    return validation_errors({"form": [EXPIRED_FORM]}, status=403)
