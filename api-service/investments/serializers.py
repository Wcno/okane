from decimal import ROUND_HALF_UP, Decimal

from rest_framework import serializers
from rest_framework.exceptions import NotFound

from accounts import clock
from accounts.models import Account
from accounts.serializers import (
    DECIMAL_ERRORS,
    DecimalStringField,
    StrictIntegerField,
    messages,
)
from investments.holdings import exact, sellable_units
from investments.models import Asset, InvestmentTransaction

SMALLEST_QUANTITY = Decimal("0.00000001")
CENT = Decimal("0.01")
LARGEST_CASH = Decimal("999999999999.99")

UNITS_INVALID = "Escribe las unidades mayores que cero, con ocho decimales como máximo. Ejemplo: 0.25"
UNIT_PRICE_INVALID = (
    "Escribe el precio por unidad mayor que cero, con ocho decimales como máximo. Ejemplo: 187.35"
)
ACCOUNT_REQUIRED = "Elige la Cuenta de inversión de la operación."
ASSET_REQUIRED = "Elige el Activo de la operación."
ACCOUNT_NOT_INVESTMENT = "Una compra o venta se registra en una Cuenta de inversión. Elige una."
ACCOUNT_IS_ARCHIVED = "Esta Cuenta está archivada y no admite registros nuevos. Elige otra."
DATE_INVALID = "Escribe la fecha de la operación, por ejemplo 2026-11-16."
DATE_IN_FUTURE = "La fecha no puede ser futura. Elige hoy o un día anterior."
DATE_BEFORE_ACCOUNT = "La fecha no puede ser anterior al inicio del registro de la Cuenta ({opening_date})."
CASH_ROUNDS_TO_ZERO = (
    "Con estas unidades y este precio el importe es menor que un centavo. "
    "Sube las unidades o el precio."
)
CASH_TOO_LARGE = "El importe de la operación es demasiado grande. Revisa las unidades y el precio."
SALE_EXCEEDS_UNITS = "No puedes vender {requested} unidades: la Posición tiene {available}."
SALE_EXCEEDS_UNITS_LATER = (
    "No puedes vender {requested} unidades en esa fecha: dejaría ventas posteriores sin "
    "unidades. Puedes vender hasta {available}."
)


def trimmed(units):
    """Units as a User reads them: no trailing zeros, at least one digit."""
    text = f"{units:f}"
    return text.rstrip("0").rstrip(".") if "." in text else text


def quantity_field(message, minimum=SMALLEST_QUANTITY):
    return DecimalStringField(
        max_digits=20,
        decimal_places=8,
        min_value=minimum,
        error_messages=messages(message, *DECIMAL_ERRORS),
    )


@exact
def cash_for(units, unit_price):
    """Cash of an operation: the exact product, rounded to cents with halves away from zero."""
    return (units * unit_price).quantize(CENT, rounding=ROUND_HALF_UP)


class InvestmentTransactionSerializer(serializers.Serializer):
    """Validates a purchase or a sale; the context holds `user_id` and `type`.

    The Account is locked, so two sales of the same Account queue up and the
    second one is checked against the units the first left. `validated_data`
    carries the Account and the Asset objects.
    """

    id = serializers.IntegerField(read_only=True)
    type = serializers.CharField(read_only=True)
    account_id = StrictIntegerField(
        error_messages=messages(ACCOUNT_REQUIRED, "required", "null", "invalid"),
    )
    asset_id = StrictIntegerField(
        error_messages=messages(ASSET_REQUIRED, "required", "null", "invalid"),
    )
    units = quantity_field(UNITS_INVALID)
    unit_price = quantity_field(UNIT_PRICE_INVALID)
    cash_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    date = serializers.DateField(
        required=False,
        error_messages=messages(DATE_INVALID, "null", "invalid", "datetime"),
    )

    def validate_account_id(self, value):
        # Another User's Account is as absent as an unknown one.
        account = (
            Account.objects.select_for_update()
            .filter(user_id=self.context["user_id"], pk=value)
            .first()
        )
        if account is None:
            raise NotFound
        return account

    def validate_asset_id(self, value):
        asset = Asset.objects.filter(pk=value).first()
        if asset is None:
            raise NotFound
        return asset

    def validate(self, data):
        account = data.pop("account_id")
        asset = data.pop("asset_id")
        if account.type != Account.Type.INVESTMENT:
            raise serializers.ValidationError({"account_id": [ACCOUNT_NOT_INVESTMENT]})
        if account.archived_at is not None:
            raise serializers.ValidationError({"account_id": [ACCOUNT_IS_ARCHIVED]})

        data.setdefault("date", clock.today())
        if data["date"] > clock.today():
            raise serializers.ValidationError({"date": [DATE_IN_FUTURE]})
        if data["date"] < account.opening_date:
            message = DATE_BEFORE_ACCOUNT.format(opening_date=account.opening_date.isoformat())
            raise serializers.ValidationError({"date": [message]})

        cash = cash_for(data["units"], data["unit_price"])
        if cash > LARGEST_CASH:
            raise serializers.ValidationError({"units": [CASH_TOO_LARGE]})
        if cash <= 0:
            raise serializers.ValidationError({"units": [CASH_ROUNDS_TO_ZERO]})

        if self.context["type"] == InvestmentTransaction.Type.SELL:
            self.check_units_to_sell(account, asset, data)
        data.update(account=account, asset=asset, cash_amount=cash)
        return data

    def check_units_to_sell(self, account, asset, data):
        history = list(
            InvestmentTransaction.objects.filter(account=account, asset=asset).order_by("date", "id")
        )
        available = sellable_units(history, data["date"])
        if data["units"] <= available:
            return
        held_then = sellable_units([t for t in history if t.date <= data["date"]], data["date"])
        if data["units"] > held_then:
            message = SALE_EXCEEDS_UNITS.format(
                requested=trimmed(data["units"]), available=trimmed(held_then)
            )
        else:
            message = SALE_EXCEEDS_UNITS_LATER.format(
                requested=trimmed(data["units"]), available=trimmed(available)
            )
        raise serializers.ValidationError({"units": [message]})

    def create(self, validated_data):
        return InvestmentTransaction.objects.create(
            user_id=self.context["user_id"], type=self.context["type"], **validated_data
        )
