"""`GET, PUT /api/settings/preferences`: the User's visual preferences (docs/contratos.md)."""

import json
from datetime import date

import httpx
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from gateway.upstream import api_service, service_headers
from preferences.models import (
    DASHBOARD_SECTIONS,
    GROUPINGS,
    MOVEMENT_TYPES,
    PERIODS,
    UserPreferences,
)

UNREADABLE = "No pudimos leer tus preferencias. Recarga la página e inténtalo de nuevo."
INVALID_TYPE = "Elige un tipo de movimiento de la lista."
INVALID_PERIOD = "Elige un período de la lista."
INVALID_GROUPING = "Elige agrupar por fecha o por tipo."
INVALID_SECTIONS = "Elige secciones del Panel de la lista."
INVALID_DAY = "Escribe una fecha válida, por ejemplo 2026-11-01."
CUSTOM_PERIOD_EMPTY = "Escribe desde cuándo, hasta cuándo, o ambas fechas."
PERIOD_REVERSED = "El período no puede terminar antes de empezar."
INVALID_ACCOUNT = "Elige una de tus Cuentas."


def as_json(preferences):
    return {
        "movement_type": preferences.movement_type or None,
        "account_id": preferences.account_id,
        "period": preferences.period,
        "from": preferences.period_from.isoformat() if preferences.period_from else None,
        "to": preferences.period_to.isoformat() if preferences.period_to else None,
        "grouping": preferences.grouping,
        "visible_sections": [
            name for name in DASHBOARD_SECTIONS if name not in preferences.hidden_sections
        ],
    }


def read_day(value):
    if value is None or value == "":
        return None
    if isinstance(value, str) and len(value) == 10:
        try:
            return date.fromisoformat(value)
        except ValueError:
            pass
    raise ValueError


def owns_account(user_id, account_id):
    """Whether api-service knows the Account as the User's; any other answer raises."""
    url = f"{settings.API_SERVICE_URL}/api/accounts/{account_id}"
    answer = api_service.get(url, headers=service_headers({}, user_id))
    if answer.status_code == 200:
        return True
    if answer.status_code == 404:
        return False
    raise httpx.HTTPError("unexpected answer")


def validate(data):
    """Return `(values, errors)` for a whole preferences document."""
    errors = {}
    values = {}

    movement_type = data.get("movement_type")
    if movement_type in (None, ""):
        values["movement_type"] = ""
    elif movement_type in MOVEMENT_TYPES:
        values["movement_type"] = movement_type
    else:
        errors["movement_type"] = [INVALID_TYPE]

    account_id = data.get("account_id")
    if account_id is None:
        values["account_id"] = None
    elif isinstance(account_id, int) and not isinstance(account_id, bool) and account_id > 0:
        values["account_id"] = account_id
    else:
        errors["account_id"] = [INVALID_ACCOUNT]

    period = data.get("period")
    if period not in PERIODS:
        errors["period"] = [INVALID_PERIOD]
    else:
        values["period"] = period
    values["period_from"] = values["period_to"] = None
    if period == "custom":
        days = {}
        for key in ("from", "to"):
            try:
                days[key] = read_day(data.get(key))
            except ValueError:
                errors[key] = [INVALID_DAY]
        if not errors.keys() & {"from", "to"}:
            if days["from"] is None and days["to"] is None:
                errors["period"] = [CUSTOM_PERIOD_EMPTY]
            elif days["from"] and days["to"] and days["from"] > days["to"]:
                errors["to"] = [PERIOD_REVERSED]
            else:
                values["period_from"], values["period_to"] = days["from"], days["to"]

    grouping = data.get("grouping")
    if grouping in GROUPINGS:
        values["grouping"] = grouping
    else:
        errors["grouping"] = [INVALID_GROUPING]

    visible = data.get("visible_sections")
    if (
        isinstance(visible, list)
        and all(isinstance(name, str) and name in DASHBOARD_SECTIONS for name in visible)
        and len(set(visible)) == len(visible)
    ):
        values["hidden_sections"] = [name for name in DASHBOARD_SECTIONS if name not in visible]
    else:
        errors["visible_sections"] = [INVALID_SECTIONS]

    return values, errors


@require_http_methods(["GET", "PUT"])
def preferences(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"detail": "authentication_required"}, status=401)

    if request.method == "GET":
        return JsonResponse(as_json(UserPreferences.objects.filter(user=user).first() or UserPreferences()))

    try:
        data = json.loads(request.body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        data = None
    if not isinstance(data, dict):
        return JsonResponse({"errors": {"form": [UNREADABLE]}}, status=400)

    values, errors = validate(data)
    if not errors and values["account_id"] is not None:
        try:
            if not owns_account(user.pk, values["account_id"]):
                errors["account_id"] = [INVALID_ACCOUNT]
        except httpx.HTTPError:
            return JsonResponse({"status": "unavailable", "service": "api-service"}, status=502)
    if errors:
        return JsonResponse({"errors": errors}, status=400)

    saved, _ = UserPreferences.objects.update_or_create(user=user, defaults=values)
    return JsonResponse(as_json(saved))
