"""Conventions every endpoint of api-service shares (docs/contratos.md)."""

from django.http import Http404
from rest_framework import exceptions
from rest_framework.views import exception_handler as default_handler

UNREADABLE_REQUEST = "No pudimos leer los datos enviados. Recarga la página e inténtalo de nuevo."

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def field_errors(detail):
    """Shape validation errors as `{field: [messages]}`; `form` holds the rest."""
    if not isinstance(detail, dict):
        detail = {"form": detail}
    errors = {}
    for field, messages in detail.items():
        name = "form" if field == "non_field_errors" else field
        if not isinstance(messages, (list, tuple)):
            messages = [messages]
        errors.setdefault(name, []).extend(str(message) for message in messages)
    return errors


def exception_handler(exc, context):
    response = default_handler(exc, context)
    if response is None:
        return None
    if isinstance(exc, exceptions.ValidationError):
        response.data = {"errors": field_errors(exc.detail)}
    elif isinstance(exc, exceptions.ParseError):
        response.data = {"errors": {"form": [UNREADABLE_REQUEST]}}
    elif isinstance(exc, (Http404, exceptions.NotFound)):
        response.data = {"detail": "not_found"}
    return response


def _positive_integer(request, name, default, maximum=None):
    text = request.query_params.get(name)
    if text is None:
        return default
    if not (text.isascii() and text.isdigit()) or int(text) < 1:
        raise exceptions.ValidationError({name: ["Debe ser un número entero mayor que cero."]})
    value = int(text)
    if maximum is not None and value > maximum:
        raise exceptions.ValidationError({name: [f"El máximo es {maximum}."]})
    return value


def paginate(request, queryset):
    """Return the requested page of an ordered queryset and how to continue.

    Pages hold 50 items unless `page_size` says otherwise, up to 200. A size
    or a page out of range is a validation error, never a silent correction.
    """
    page_size = _positive_integer(request, "page_size", DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    page = _positive_integer(request, "page", 1)
    total = queryset.count()
    last_page = max(1, -(-total // page_size))
    if page > last_page:
        raise exceptions.ValidationError({"page": [f"La última página es la {last_page}."]})
    start = (page - 1) * page_size
    items = list(queryset[start : start + page_size])
    return items, {
        "total": total,
        "page": page,
        "page_size": page_size,
        "next_page": page + 1 if page < last_page else None,
    }
