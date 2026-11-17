"""The writes and reads that `/api/v1` adds to what the application already offers (docs/contratos.md).

webapp authenticates the token and sends the User it belongs to; the rules of
every record are the ones of the application's own serializers.
"""

import hashlib
import json

from django.db import connection, transaction
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from accounts import ledger, movements
from expenses.serializers import ExpenseSerializer
from incomes.serializers import IncomeSerializer
from investments.models import InvestmentTransaction
from investments.serializers import InvestmentTransactionSerializer
from public_api.models import IdempotencyRecord
from transfers.serializers import TransferSerializer

CREATE_MOVEMENT = "movements.create"
KEY_MAX_LENGTH = IdempotencyRecord._meta.get_field("key").max_length

KEY_REQUIRED = "Envía la cabecera Idempotency-Key con una clave única para esta operación."
KEY_INVALID = (
    f"La clave de idempotencia admite de 1 a {KEY_MAX_LENGTH} caracteres ASCII visibles, sin espacios."
)
KEY_REUSED = "Esta clave ya se usó con otro contenido. Usa una clave nueva para una operación nueva."
BODY_INVALID = "Envía un objeto JSON con los datos del movimiento."
TYPE_INVALID = "Elige un tipo de movimiento: " + ", ".join(ledger.MOVEMENT_TYPES) + "."

SERIALIZERS = {
    "income": IncomeSerializer,
    "expense": ExpenseSerializer,
    "transfer": TransferSerializer,
    InvestmentTransaction.Type.BUY: InvestmentTransactionSerializer,
    InvestmentTransaction.Type.SELL: InvestmentTransactionSerializer,
    InvestmentTransaction.Type.DIVIDEND: InvestmentTransactionSerializer,
}


def _fail(field, message):
    raise ValidationError({field: [message]})


def _key(request):
    key = request.headers.get("Idempotency-Key")
    if key is None:
        _fail("idempotency_key", KEY_REQUIRED)
    if not (key.isascii() and key.isprintable() and " " not in key and 0 < len(key) <= KEY_MAX_LENGTH):
        _fail("idempotency_key", KEY_INVALID)
    return key


def _fingerprint(body):
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _lock_key(user_id, key):
    """Queue concurrent writes of one key, so the second one finds the first one's answer."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s, hashtext(%s))", [user_id % 2**31, key])


def _stored(user_id, key):
    return IdempotencyRecord.objects.filter(user_id=user_id, operation=CREATE_MOVEMENT, key=key).first()


def _create(user_id, body):
    kind = body["type"]
    data = {name: value for name, value in body.items() if name != "type"}
    context = {"user_id": user_id}
    if SERIALIZERS[kind] is InvestmentTransactionSerializer:
        context["type"] = kind
    serializer = SERIALIZERS[kind](data=data, context=context)
    serializer.is_valid(raise_exception=True)
    created = serializer.save()
    shown = SERIALIZERS[kind](created, context=context).data
    # Rendered and parsed again, so what is stored is exactly what the client reads.
    return json.loads(JSONRenderer().render({**shown, "type": kind}))


def _record_movement(request):
    user_id = request.okane_user_id
    key = _key(request)
    body = request.data
    if not isinstance(body, dict):
        _fail("form", BODY_INVALID)
    if body.get("type") not in SERIALIZERS:
        _fail("type", TYPE_INVALID)
    fingerprint = _fingerprint(body)

    with transaction.atomic():
        _lock_key(user_id, key)
        stored = _stored(user_id, key)
        if stored is not None:
            if stored.fingerprint != fingerprint:
                return Response({"errors": {"idempotency_key": [KEY_REUSED]}}, status=409)
            return Response(stored.body, status=200)
        # A refusal raises here, undoing the write and leaving the key free for a fixed request.
        created = _create(user_id, body)
        IdempotencyRecord.objects.create(
            user_id=user_id,
            operation=CREATE_MOVEMENT,
            key=key,
            fingerprint=fingerprint,
            status_code=201,
            body=created,
        )
    return Response(created, status=201)


@api_view(["GET", "POST"])
def movement_collection(request):
    if request.method == "POST":
        return _record_movement(request)
    return movements.movement_collection(request._request)
