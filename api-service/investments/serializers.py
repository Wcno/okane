from decimal import ROUND_HALF_UP, Decimal

from rest_framework import serializers
from rest_framework.exceptions import NotFound

from accounts import clock
from accounts.dates import spanish_day
from accounts.models import Account
from accounts.serializers import (
    DecimalStringField,
    StrictIntegerField,
    amount_messages,
    messages,
)
from investments.chronology import (
    CHANGE_LEAVES_SALE_SHORT,
    first_shortfall,
    history,
)
from investments.holdings import exact, sellable_units, trimmed
from investments.models import Asset, InvestmentTransaction

SMALLEST_QUANTITY = Decimal("0.00000001")
CENT = Decimal("0.01")
LARGEST_CASH = Decimal("999999999999.99")

UNITS_INVALID = "Escribe las unidades mayores que cero, con ocho decimales como máximo. Ejemplo: 0.25"
UNIT_PRICE_INVALID = (
    "Escribe el precio por unidad mayor que cero, con ocho decimales como máximo. Ejemplo: 187.35"
)
UNITS_TOO_LARGE = "Las unidades son demasiado grandes. El máximo es 999,999,999,999."
UNIT_PRICE_TOO_LARGE = "El precio por unidad es demasiado grande. El máximo es $999,999,999,999."
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
UNKNOWN_FIELD = "Este dato no se admite en una compra ni en una venta."
SALE_EXCEEDS_UNITS = "No puedes vender {requested} unidades: la Posición tiene {available}."
SALE_EXCEEDS_UNITS_LATER = (
    "No puedes vender {requested} unidades en esa fecha: dejaría ventas posteriores sin "
    "unidades. Puedes vender hasta {available}."
)


def quantity_field(invalid, too_large):
    return DecimalStringField(
        max_digits=20,
        decimal_places=8,
        min_value=SMALLEST_QUANTITY,
        error_messages=amount_messages(invalid, too_large),
    )


@exact
def cash_for(units, unit_price):
    """Cash of an operation: the exact product, rounded to cents with halves away from zero."""
    return (units * unit_price).quantize(CENT, rounding=ROUND_HALF_UP)


class InvestmentTransactionSerializer(serializers.Serializer):
    """Validates a purchase or a sale; the context holds `user_id` and `type`.

    The Account is locked, so two sales of the same Account queue up and the
    second one is checked against the units the first left. Given an instance,
    it validates a change of that record, which keeps its type, and checks the
    whole history of every Position the change touches. `validated_data`
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
    units = quantity_field(UNITS_INVALID, UNITS_TOO_LARGE)
    unit_price = quantity_field(UNIT_PRICE_INVALID, UNIT_PRICE_TOO_LARGE)
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
        # A field api-service does not know is refused, never ignored: a client that sends
        # a commission must not believe it was recorded (commissions arrive with another ticket).
        sent = self.initial_data if isinstance(self.initial_data, dict) else {}
        known = {name for name, field in self.fields.items() if not field.read_only}
        unknown = {name: [UNKNOWN_FIELD] for name in sent if name not in known}
        if unknown:
            raise serializers.ValidationError(unknown)

        account = data.pop("account_id")
        asset = data.pop("asset_id")
        if account.type != Account.Type.INVESTMENT:
            raise serializers.ValidationError({"account_id": [ACCOUNT_NOT_INVESTMENT]})
        # Correcting a record of an Account archived since is a correction of history;
        # only moving one into such an Account is a new operation.
        stays = self.instance is not None and self.instance.account_id == account.id
        if account.archived_at is not None and not stays:
            raise serializers.ValidationError({"account_id": [ACCOUNT_IS_ARCHIVED]})

        if "date" not in data:
            if self.instance is not None:
                raise serializers.ValidationError({"date": [DATE_INVALID]})
            data["date"] = clock.today()
        if data["date"] > clock.today():
            raise serializers.ValidationError({"date": [DATE_IN_FUTURE]})
        if data["date"] < account.opening_date:
            message = DATE_BEFORE_ACCOUNT.format(opening_date=spanish_day(account.opening_date))
            raise serializers.ValidationError({"date": [message]})

        cash = cash_for(data["units"], data["unit_price"])
        if cash > LARGEST_CASH:
            raise serializers.ValidationError({"units": [CASH_TOO_LARGE]})
        if cash <= 0:
            raise serializers.ValidationError({"units": [CASH_ROUNDS_TO_ZERO]})

        data.update(account=account, asset=asset, cash_amount=cash)
        if self.instance is not None:
            self.check_history_after_change(data)
        elif self.context["type"] == InvestmentTransaction.Type.SELL:
            self.check_units_to_sell(account, asset, data)
        return data

    def check_history_after_change(self, data):
        """Every Position the change touches must still cover its sales, from its first day to its last."""
        record = self.instance
        candidate = InvestmentTransaction(
            pk=record.pk,
            user_id=record.user_id,
            type=record.type,
            account=data["account"],
            asset=data["asset"],
            units=data["units"],
            unit_price=data["unit_price"],
            cash_amount=data["cash_amount"],
            date=data["date"],
        )
        touched = {(record.account_id, record.asset_id), (candidate.account_id, candidate.asset_id)}
        for account_id, asset_id in touched:
            transactions = history(record.user_id, account_id, asset_id, except_id=record.pk)
            if (account_id, asset_id) == (candidate.account_id, candidate.asset_id):
                transactions.append(candidate)
            shortfall = first_shortfall(transactions)
            if shortfall is not None:
                raise serializers.ValidationError(
                    {"units": [shortfall.explain(CHANGE_LEAVES_SALE_SHORT)]}
                )

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

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
