from decimal import Decimal

from rest_framework import serializers
from rest_framework.exceptions import NotFound

from accounts import clock
from accounts.dates import spanish_day
from accounts.models import Account
from accounts.serializers import AMOUNT_LIMIT, DecimalStringField, amount_messages, messages
from expenses.serializers import StrictIntegerField
from transfers.models import DESCRIPTION_MAX_LENGTH, Transfer

AMOUNT_INVALID = "Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 250.00"
AMOUNT_TOO_LARGE = f"El monto es demasiado grande. El máximo es ${AMOUNT_LIMIT}."
SOURCE_REQUIRED = "Elige la Cuenta de la que sale el dinero."
DESTINATION_REQUIRED = "Elige la Cuenta a la que llega el dinero."
SAME_ACCOUNT = "El origen y el destino deben ser Cuentas distintas."
ACCOUNT_IS_ARCHIVED = "Esta Cuenta está archivada y no admite registros nuevos. Elige otra."
DATE_INVALID = "Escribe la fecha de la transferencia, por ejemplo 2026-11-16."
DATE_IN_FUTURE = "La fecha no puede ser futura. Elige hoy o un día anterior."
DATE_BEFORE_ACCOUNT = (
    "La fecha no puede ser anterior al inicio del registro de la Cuenta {name} ({opening_date})."
)
DESCRIPTION_NOT_TEXT = "La descripción debe ser texto."
DESCRIPTION_TOO_LONG = f"La descripción admite hasta {DESCRIPTION_MAX_LENGTH} caracteres."

ACCOUNT_FIELDS = ("source_account_id", "destination_account_id")


class TransferSerializer(serializers.Serializer):
    """Validates a Transfer; `context["user_id"]` is the User webapp authenticated.

    Both Accounts are looked up among the User's own and locked in one query,
    in id order, before any other field is judged: a concurrent archive cannot
    slip between the checks and the write, two opposite Transfers cannot wait
    on each other, and an Account that is not the User's answers 404 whatever
    else is wrong. `validated_data` carries the Account objects under
    `source_account` and `destination_account`.
    """

    id = serializers.IntegerField(read_only=True)
    amount = DecimalStringField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
        error_messages=amount_messages(AMOUNT_INVALID, AMOUNT_TOO_LARGE),
    )
    source_account_id = StrictIntegerField(
        error_messages=messages(SOURCE_REQUIRED, "required", "null", "invalid"),
    )
    destination_account_id = StrictIntegerField(
        error_messages=messages(DESTINATION_REQUIRED, "required", "null", "invalid"),
    )
    date = serializers.DateField(
        required=False,
        error_messages=messages(DATE_INVALID, "null", "invalid", "datetime"),
    )
    description = serializers.CharField(
        max_length=DESCRIPTION_MAX_LENGTH,
        required=False,
        allow_blank=True,
        error_messages={
            **messages(DESCRIPTION_NOT_TEXT, "invalid", "null"),
            "max_length": DESCRIPTION_TOO_LONG,
        },
    )

    def to_internal_value(self, data):
        self._accounts = self._lock_accounts(data) if isinstance(data, dict) else {}
        return super().to_internal_value(data)

    def _lock_accounts(self, data):
        ids = {
            value
            for field in ACCOUNT_FIELDS
            if isinstance(value := data.get(field), int) and not isinstance(value, bool)
        }
        accounts = {
            account.id: account
            for account in Account.objects.select_for_update()
            .filter(user_id=self.context["user_id"], pk__in=ids)
            .order_by("pk")
        }
        # Another User's Account is as absent as an unknown one.
        if accounts.keys() != ids:
            raise NotFound
        return accounts

    def validate(self, data):
        source = self._accounts[data.pop("source_account_id")]
        destination = self._accounts[data.pop("destination_account_id")]
        if source.id == destination.id:
            raise serializers.ValidationError({"destination_account_id": [SAME_ACCOUNT]})

        # Correcting a Transfer that touches an Account archived since is a
        # correction of history; only pointing it at such an Account is new.
        errors = {
            field: [ACCOUNT_IS_ARCHIVED]
            for field, account in zip(ACCOUNT_FIELDS, (source, destination))
            if account.archived_at is not None and self._kept(field) != account.id
        }
        if errors:
            raise serializers.ValidationError(errors)

        if "date" not in data:
            if self.instance is not None:
                raise serializers.ValidationError({"date": [DATE_INVALID]})
            data["date"] = clock.today()
        if data["date"] > clock.today():
            raise serializers.ValidationError({"date": [DATE_IN_FUTURE]})
        for account in (source, destination):
            if data["date"] < account.opening_date:
                message = DATE_BEFORE_ACCOUNT.format(
                    name=account.name, opening_date=spanish_day(account.opening_date)
                )
                raise serializers.ValidationError({"date": [message]})
        data["source_account"] = source
        data["destination_account"] = destination
        return data

    def _kept(self, field):
        return None if self.instance is None else getattr(self.instance, field)

    def create(self, validated_data):
        return Transfer.objects.create(user_id=self.context["user_id"], **validated_data)

    def update(self, instance, validated_data):
        validated_data.setdefault("description", "")
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
