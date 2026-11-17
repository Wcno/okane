"""The Movements view: every kind of record of a User in one list (docs/contratos.md)."""

import datetime

from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from accounts import ledger
from accounts.models import Account
from config.rest import paginate

TYPE_INVALID = "Elige un tipo de movimiento de la lista."
ACCOUNT_INVALID = "Elige una Cuenta de la lista."
FROM_INVALID = "Escribe el primer día del período, por ejemplo 2026-11-01."
TO_INVALID = "Escribe el último día del período, por ejemplo 2026-11-30."
PERIOD_REVERSED = "El período no puede terminar antes de empezar."


def _fail(name, message):
    raise ValidationError({name: [message]})


def _day(request, name, message):
    text = request.query_params.get(name)
    if text is None:
        return None
    try:
        if text.isascii() and len(text) == 10:
            return datetime.date.fromisoformat(text)
    except ValueError:
        pass
    return _fail(name, message)


def _filter(request):
    types = request.query_params.getlist("type")
    if any(kind not in ledger.MOVEMENT_TYPES for kind in types):
        _fail("type", TYPE_INVALID)
    account_text = request.query_params.get("account_id")
    account_id = None
    if account_text is not None:
        if not (account_text.isascii() and account_text.isdigit()):
            _fail("account_id", ACCOUNT_INVALID)
        # Another User's Account is as absent as an unknown one.
        if not Account.objects.filter(user_id=request.okane_user_id, pk=int(account_text)).exists():
            raise NotFound
        account_id = int(account_text)
    start = _day(request, "from", FROM_INVALID)
    end = _day(request, "to", TO_INVALID)
    if start is not None and end is not None and start > end:
        _fail("to", PERIOD_REVERSED)
    return ledger.MovementFilter(
        types=frozenset(types or ledger.MOVEMENT_TYPES), account_id=account_id, start=start, end=end
    )


class MovementWindow:
    """The User's matching Movements as `paginate` reads a queryset: a count and slices."""

    def __init__(self, user_id, wanted):
        self.user_id = user_id
        self.wanted = wanted

    def count(self):
        return ledger.movements(self.user_id, self.wanted, 0)[0]

    def __getitem__(self, window):
        _, found = ledger.movements(self.user_id, self.wanted, window.stop)
        return found[window.start :]


def represent(movement):
    return {**movement, "date": movement["date"].isoformat()}


@api_view(["GET"])
def movement_collection(request):
    movements, page = paginate(request, MovementWindow(request.okane_user_id, _filter(request)))
    return Response({"results": [represent(movement) for movement in movements], **page})
