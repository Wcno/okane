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
    CHANGE_ORPHANS_DIVIDEND,
    first_problem,
    first_unfunded_dividend,
    history,
)
from investments.holdings import exact, sellable_units, trimmed
from investments.models import Asset, InvestmentTransaction, ReferencePrice

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
ACCOUNT_NOT_INVESTMENT = "Una compra, venta o Dividendo se registra en una Cuenta de inversión. Elige una."
ACCOUNT_IS_ARCHIVED = "Esta Cuenta está archivada y no admite registros nuevos. Elige otra."
DATE_INVALID = "Escribe la fecha de la operación, por ejemplo 2026-11-16."
DATE_IN_FUTURE = "La fecha no puede ser futura. Elige hoy o un día anterior."
DATE_BEFORE_ACCOUNT = "La fecha no puede ser anterior al inicio del registro de la Cuenta ({opening_date})."
CASH_ROUNDS_TO_ZERO = (
    "Con estas unidades y este precio el importe es menor que un centavo. "
    "Sube las unidades o el precio."
)
CASH_TOO_LARGE = "El importe de la operación es demasiado grande. Revisa las unidades y el precio."
PRICE_INVALID = (
    "Escribe el precio mayor que cero, con ocho decimales como máximo. Ejemplo: 187.35"
)
PRICE_TOO_LARGE = "El precio es demasiado grande. El máximo es $999,999,999,999."
PRICE_DATE_INVALID = "Escribe la fecha del precio, por ejemplo 2026-11-16."
PRICE_DATE_IN_FUTURE = "La fecha del precio no puede ser futura. Elige hoy o un día anterior."
UNKNOWN_FIELD = "Este dato no se admite en esta operación."
COMMISSION_INVALID = (
    "Escribe la comisión como un importe de cero o más, con dos decimales como máximo. Ejemplo: 1.50"
)
COMMISSION_TOO_LARGE = "La comisión es demasiado grande. El máximo es $999,999,999,999.99."
AMOUNT_INVALID = (
    "Escribe el importe del Dividendo mayor que cero, con dos decimales como máximo. Ejemplo: 12.40"
)
AMOUNT_TOO_LARGE = "El importe del Dividendo es demasiado grande. El máximo es $999,999,999,999.99."
DIVIDEND_WITHOUT_UNITS = (
    "No tenías unidades de este Activo en esa Cuenta ese día. Elige otra fecha o Cuenta."
)
SALE_ORPHANS_DIVIDEND = (
    "No puedes registrar esta venta: dejaría sin unidades al Dividendo del {date}."
)
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
    """Validates a purchase, a sale or a Dividend; the context holds `user_id` and `type`.

    A Dividend takes an `amount` instead of units, price and commission.

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
    commission = DecimalStringField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
        default=Decimal(0),
        error_messages=amount_messages(COMMISSION_INVALID, COMMISSION_TOO_LARGE),
    )
    date = serializers.DateField(
        required=False,
        error_messages=messages(DATE_INVALID, "null", "invalid", "datetime"),
    )

    def get_fields(self):
        fields = super().get_fields()
        if self.context["type"] == InvestmentTransaction.Type.DIVIDEND:
            # They stay in what is shown (null units, no commission) but are not accepted.
            for name, decimals in (("units", 8), ("unit_price", 8), ("commission", 2)):
                fields[name] = serializers.DecimalField(
                    max_digits=20, decimal_places=decimals, read_only=True
                )
            fields["amount"] = DecimalStringField(
                max_digits=14,
                decimal_places=2,
                min_value=CENT,
                write_only=True,
                error_messages=amount_messages(AMOUNT_INVALID, AMOUNT_TOO_LARGE),
            )
        return fields

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
        # a commission with a Dividend must not believe it was recorded.
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

        if self.context["type"] == InvestmentTransaction.Type.DIVIDEND:
            cash = data.pop("amount")
        else:
            cash = cash_for(data["units"], data["unit_price"])
            if cash > LARGEST_CASH:
                raise serializers.ValidationError({"units": [CASH_TOO_LARGE]})
            if cash <= 0:
                raise serializers.ValidationError({"units": [CASH_ROUNDS_TO_ZERO]})

        data.update(account=account, asset=asset, cash_amount=cash)
        if self.instance is not None:
            self.check_history_after_change(data)
        else:
            if self.context["type"] == InvestmentTransaction.Type.SELL:
                self.check_units_to_sell(account, asset, data)
            self.check_dividends_after_new(account, asset, data)
        return data

    def check_dividends_after_new(self, account, asset, data):
        """A new Dividend needs units that day; a new sale must not take them from a Dividend."""
        candidate = InvestmentTransaction(
            user_id=self.context["user_id"], type=self.context["type"], **data
        )
        transactions = [*history(self.context["user_id"], account.id, asset.id), candidate]
        unfunded = first_unfunded_dividend(transactions)
        if unfunded is None:
            return
        if candidate.type == InvestmentTransaction.Type.DIVIDEND:
            raise serializers.ValidationError({"asset_id": [DIVIDEND_WITHOUT_UNITS]})
        message = SALE_ORPHANS_DIVIDEND.format(date=spanish_day(unfunded.date))
        raise serializers.ValidationError({"units": [message]})

    def check_history_after_change(self, data):
        """Every Position the change touches must still cover its sales, from its first day to its last."""
        record = self.instance
        candidate = InvestmentTransaction(
            pk=record.pk,
            user_id=record.user_id,
            type=record.type,
            account=data["account"],
            asset=data["asset"],
            units=data.get("units"),
            unit_price=data.get("unit_price"),
            cash_amount=data["cash_amount"],
            commission=data.get("commission", 0),
            date=data["date"],
        )
        touched = {(record.account_id, record.asset_id), (candidate.account_id, candidate.asset_id)}
        for account_id, asset_id in touched:
            transactions = history(record.user_id, account_id, asset_id, except_id=record.pk)
            if (account_id, asset_id) == (candidate.account_id, candidate.asset_id):
                transactions.append(candidate)
            problem = first_problem(
                transactions,
                sale_message=CHANGE_LEAVES_SALE_SHORT,
                dividend_message=CHANGE_ORPHANS_DIVIDEND,
            )
            if problem is not None:
                field = "asset_id" if candidate.type == InvestmentTransaction.Type.DIVIDEND else "units"
                raise serializers.ValidationError({field: [problem]})

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



class ReferencePriceSerializer(serializers.Serializer):
    """Validates a manual Reference Price; the context holds `user_id` and the `asset`.

    A price is one per User, Asset and day: setting it again that day corrects it.
    """

    value = quantity_field(PRICE_INVALID, PRICE_TOO_LARGE)
    date = serializers.DateField(
        required=False,
        error_messages=messages(PRICE_DATE_INVALID, "null", "invalid", "datetime"),
    )

    def validate(self, data):
        sent = self.initial_data if isinstance(self.initial_data, dict) else {}
        unknown = {name: [UNKNOWN_FIELD] for name in sent if name not in self.fields}
        if unknown:
            raise serializers.ValidationError(unknown)
        data.setdefault("date", clock.today())
        if data["date"] > clock.today():
            raise serializers.ValidationError({"date": [PRICE_DATE_IN_FUTURE]})
        return data

    def save(self):
        price, _ = ReferencePrice.objects.update_or_create(
            user_id=self.context["user_id"],
            asset=self.context["asset"],
            date=self.validated_data["date"],
            defaults={"value": self.validated_data["value"]},
        )
        return price
