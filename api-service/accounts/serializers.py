import re

from rest_framework import serializers

from accounts import clock
from accounts.models import Account

# What 14 digits with 2 decimals can hold; the largest amount any money field takes.
AMOUNT_LIMIT = "999,999,999,999.99"

NAME_REQUIRED = "Escribe el nombre de la Cuenta, por ejemplo Cuenta corriente."
NAME_TOO_LONG = "El nombre admite hasta 80 caracteres."
TYPE_INVALID = "Elige el tipo de Cuenta: gastos, ahorro o inversión."
OPENING_BALANCE_INVALID = (
    "Escribe el Saldo inicial con dos decimales como máximo, por ejemplo 1250.00 o -312.45."
)
OPENING_BALANCE_TOO_LARGE = f"El Saldo inicial es demasiado grande. El máximo es ${AMOUNT_LIMIT}."
OPENING_DATE_INVALID = "Escribe la fecha de inicio del registro, por ejemplo 2026-11-01."
OPENING_DATE_IN_FUTURE = "La fecha de inicio no puede ser futura. Elige hoy o un día anterior."
RATE_INVALID = "La tasa anual debe ser cero o mayor, con hasta seis decimales como razón."
RATE_NOT_FOR_SAVINGS = "Solo una Cuenta de ahorro lleva tasa de interés anual."
IMMUTABLE = {
    "type": "El tipo no se puede cambiar después de crear la Cuenta.",
    "opening_balance": "El Saldo inicial no se puede cambiar después de crear la Cuenta.",
    "opening_date": "La fecha de inicio no se puede cambiar después de crear la Cuenta.",
    "balance": (
        "El Saldo no se edita: se calcula a partir del Saldo inicial y de lo registrado. "
        "Para corregirlo, registra o corrige un movimiento."
    ),
}

PLAIN_DECIMAL = re.compile(r"-?[0-9]+(\.[0-9]+)?", re.ASCII)


def messages(message, *codes):
    return dict.fromkeys(codes, message)


class StrictIntegerField(serializers.IntegerField):
    """A JSON integer: not a string, a float or a boolean."""

    def to_internal_value(self, data):
        if isinstance(data, bool) or not isinstance(data, int):
            self.fail("invalid")
        return super().to_internal_value(data)


class DecimalStringField(serializers.DecimalField):
    """A decimal sent as a plain string, never as a binary floating point number."""

    def to_internal_value(self, data):
        if not isinstance(data, str) or not PLAIN_DECIMAL.fullmatch(data.strip()):
            self.fail("invalid")
        # DRF checks the total digits first, which would call "10.1234567890123" too
        # large when only its decimals are wrong; the integer part is judged on its own.
        whole = data.strip().lstrip("-").split(".")[0].lstrip("0")
        if len(whole) > self.max_digits - self.decimal_places:
            self.fail("max_whole_digits", max_whole_digits=self.max_digits - self.decimal_places)
        return super().to_internal_value(data)


class StrictIntegerField(serializers.IntegerField):
    """A JSON integer: not a string, a float or a boolean."""

    def to_internal_value(self, data):
        if isinstance(data, bool) or not isinstance(data, int):
            self.fail("invalid")
        return super().to_internal_value(data)


TOO_LARGE_CODES = ("max_whole_digits",)
DECIMAL_ERRORS = (
    "invalid", "required", "null", "max_digits", "max_decimal_places", "min_value", "max_value",
)


def amount_messages(invalid, too_large):
    """Error messages of a money field: one for a bad amount, one for an amount past the limit."""
    return {**messages(invalid, *DECIMAL_ERRORS), **messages(too_large, *TOO_LARGE_CODES)}


def name_field():
    return serializers.CharField(
        max_length=80,
        error_messages={
            **messages(NAME_REQUIRED, "required", "blank", "null", "invalid"),
            "max_length": NAME_TOO_LONG,
        },
    )


def rate_field():
    return DecimalStringField(
        max_digits=9,
        decimal_places=6,
        min_value=0,
        required=False,
        allow_null=True,
        error_messages=messages(RATE_INVALID, *DECIMAL_ERRORS, *TOO_LARGE_CODES),
    )


class AccountSerializer(serializers.ModelSerializer):
    name = name_field()
    type = serializers.ChoiceField(
        choices=Account.Type.choices,
        error_messages=messages(TYPE_INVALID, "required", "null", "invalid_choice"),
    )
    opening_balance = DecimalStringField(
        max_digits=14,
        decimal_places=2,
        error_messages=amount_messages(OPENING_BALANCE_INVALID, OPENING_BALANCE_TOO_LARGE),
    )
    opening_date = serializers.DateField(
        error_messages=messages(OPENING_DATE_INVALID, "required", "null", "invalid", "datetime"),
    )
    annual_interest_rate = rate_field()
    balance = serializers.SerializerMethodField()
    net_contribution = serializers.SerializerMethodField()
    has_records = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "type",
            "opening_balance",
            "opening_date",
            "annual_interest_rate",
            "balance",
            "net_contribution",
            "has_records",
            "archived_at",
        ]
        read_only_fields = ["archived_at"]

    def get_balance(self, account):
        return f"{self.context['balances'][account.id]:.2f}"

    def get_net_contribution(self, account):
        """Only an investment Account has one; the other types answer `null`."""
        contribution = self.context["net_contributions"].get(account.id)
        return None if contribution is None else f"{contribution:.2f}"

    def get_has_records(self, account):
        return account.id in self.context["with_records"]

    def validate_opening_date(self, value):
        if value > clock.today():
            raise serializers.ValidationError(OPENING_DATE_IN_FUTURE)
        return value

    def validate(self, data):
        if data.get("annual_interest_rate") is not None and data["type"] != Account.Type.SAVINGS:
            raise serializers.ValidationError({"annual_interest_rate": [RATE_NOT_FOR_SAVINGS]})
        return data


class AccountUpdateSerializer(serializers.ModelSerializer):
    """Corrects what stays editable: the name and, on savings, the annual rate."""

    name = name_field()
    annual_interest_rate = rate_field()

    class Meta:
        model = Account
        fields = ["name", "annual_interest_rate"]

    def validate(self, data):
        sent = self.initial_data if isinstance(self.initial_data, dict) else {}
        immutable = {field: [message] for field, message in IMMUTABLE.items() if field in sent}
        if immutable:
            raise serializers.ValidationError(immutable)
        if (
            data.get("annual_interest_rate") is not None
            and self.instance.type != Account.Type.SAVINGS
        ):
            raise serializers.ValidationError({"annual_interest_rate": [RATE_NOT_FOR_SAVINGS]})
        return data
