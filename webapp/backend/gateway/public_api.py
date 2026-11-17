"""`/api/v1`: the public API, behind personal access tokens (ADR 0005, docs/contratos.md).

Only the calls listed in ROUTES reach api-service, each on behalf of the User
the token belongs to. Sessions and cookies play no part here, which is why
CSRF does not apply: there is no ambient credential for a third party to ride.
"""

import json
from functools import cache
from pathlib import Path

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_safe

from gateway.views import relay
from users import tokens
from users.models import PersonalToken
from users.throttling import invalid_token_limit

BEARER = "Bearer "
FINANCE_READ = PersonalToken.Scope.FINANCE_READ
MOVEMENTS_CREATE = PersonalToken.Scope.MOVEMENTS_CREATE

# Path, then method, then the permission it needs.
ROUTES = {
    "/api/v1/accounts": {"GET": FINANCE_READ},
    "/api/v1/budgets": {"GET": FINANCE_READ},
    "/api/v1/movements": {"GET": FINANCE_READ, "POST": MOVEMENTS_CREATE},
}
# Besides what every forwarded call carries, a write names its operation.
WRITE_HEADERS = ("Idempotency-Key",)

TOO_MANY_INVALID_TOKENS = (
    "Hubo demasiados intentos con un token inválido. Espera hasta 15 minutos y vuelve a intentarlo."
)
TOO_MANY_REQUESTS = "Este token superó las 120 peticiones por minuto. Espera y vuelve a intentarlo."


@cache
def _openapi_document():
    return json.loads((Path(__file__).parent / "openapi.json").read_text(encoding="utf-8"))


@require_safe
def openapi(request):
    """The contract of `/api/v1`; it describes the API and carries no data, so it needs no token."""
    return JsonResponse(_openapi_document(), json_dumps_params={"ensure_ascii": False})


def _unauthorized():
    response = JsonResponse({"detail": "authentication_required"}, status=401)
    response["WWW-Authenticate"] = "Bearer"
    return response


def _too_many(message, wait):
    response = JsonResponse({"errors": {"form": [message]}}, status=429)
    response["Retry-After"] = str(wait)
    return response


def _bearer(request):
    header = request.headers.get("Authorization", "")
    if not header[: len(BEARER)].lower() == BEARER.lower():
        return None
    return header[len(BEARER) :].strip() or None


@csrf_exempt
def public_api(request):
    origin = request.META["REMOTE_ADDR"]
    wait = invalid_token_limit.seconds_until_allowed("", origin)
    if wait:
        return _too_many(TOO_MANY_INVALID_TOKENS, wait)

    bearer = _bearer(request)
    token = tokens.authenticate(bearer) if bearer else None
    if token is None:
        if bearer:
            invalid_token_limit.record("", origin)
        return _unauthorized()

    # Counted before the route is judged: the limit is on the token, not on what it asks for.
    wait = tokens.wait_after_counting(token)
    if wait:
        return _too_many(TOO_MANY_REQUESTS, wait)

    methods = ROUTES.get(request.path)
    if methods is None:
        return JsonResponse({"detail": "not_found"}, status=404)
    needed = methods.get(request.method)
    if needed is None:
        response = HttpResponse(status=405)
        response["Allow"] = ", ".join(methods)
        return response
    if needed not in token.scopes:
        return JsonResponse({"detail": "forbidden", "required_scope": needed}, status=403)
    return relay(request, token.user_id, WRITE_HEADERS if request.method == "POST" else ())
