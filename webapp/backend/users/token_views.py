"""Managing personal access tokens from `/settings/integrations`: session and CSRF, never a token."""

from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods

from users import tokens
from users.models import PersonalToken
from users.views import UNREADABLE_REQUEST, read_json_object, validation_errors

NAME_MAX_LENGTH = PersonalToken._meta.get_field("name").max_length
NAME_REQUIRED = "Escribe un nombre para reconocer este token, por ejemplo Google Sheets."
NAME_TOO_LONG = f"El nombre admite hasta {NAME_MAX_LENGTH} caracteres."
SCOPES_REQUIRED = "Elige al menos un permiso para el token."
SCOPES_INVALID = "Elige los permisos de la lista."


def represent(token):
    return {
        "id": token.pk,
        "name": token.name,
        "prefix": token.prefix,
        "scopes": token.scopes,
        "created_at": token.created_at.isoformat(),
        "revoked_at": token.revoked_at.isoformat() if token.revoked_at else None,
    }


def authentication_required():
    return JsonResponse({"detail": "authentication_required"}, status=401)


def validated(data):
    """Return `(name, scopes)` or the errors by field."""
    name = data.get("name", "")
    scopes = data.get("scopes", [])
    errors = {}
    if not isinstance(name, str) or not name.strip():
        errors["name"] = [NAME_REQUIRED]
    elif len(name.strip()) > NAME_MAX_LENGTH:
        errors["name"] = [NAME_TOO_LONG]
    allowed = set(PersonalToken.Scope.values)
    if not isinstance(scopes, list) or not scopes:
        errors["scopes"] = [SCOPES_REQUIRED]
    elif not all(isinstance(scope, str) and scope in allowed for scope in scopes):
        errors["scopes"] = [SCOPES_INVALID]
    if errors:
        return None, errors
    # Stored in the order of the list of permissions, without repeats.
    return (name.strip(), [scope for scope in PersonalToken.Scope.values if scope in scopes]), None


@require_http_methods(["GET", "POST"])
def token_collection(request):
    user = request.user
    if not user.is_authenticated:
        return authentication_required()
    if request.method == "GET":
        return JsonResponse({"results": [represent(token) for token in user.personal_tokens.all()]})

    data = read_json_object(request)
    if data is None:
        return validation_errors({"form": [UNREADABLE_REQUEST]})
    fields, errors = validated(data)
    if errors:
        return validation_errors(errors)
    token, secret = tokens.issue(user, *fields)
    # The secret is shown once, so nothing may keep a copy of this answer.
    response = JsonResponse({"token": represent(token), "secret": secret}, status=201)
    response["Cache-Control"] = "no-store"
    return response


@require_http_methods(["DELETE"])
def token_detail(request, token_id):
    user = request.user
    if not user.is_authenticated:
        return authentication_required()
    token = user.personal_tokens.filter(pk=token_id).first()
    if token is None:
        return JsonResponse({"detail": "not_found"}, status=404)
    tokens.revoke(token)
    return HttpResponse(status=204)
