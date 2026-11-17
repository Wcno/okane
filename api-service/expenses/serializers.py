from decimal import Decimal

from rest_framework import serializers
from rest_framework.exceptions import NotFound

from accounts import clock
from accounts.models import Account
from accounts.serializers import DECIMAL_ERRORS, DecimalStringField, messages
from expenses.categories import CATEGORY_IDS
from expenses.models import Expense

DESCRIPTION_MAX_LENGTH = 140

AMOUNT_INVALID = "Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 12.50"
CATEGORY_INVALID = "Elige la Categoría del gasto."
ACCOUNT_REQUIRED = "Elige la Cuenta de la que salió el dinero."
ACCOUNT_IS_INVESTMENT = "Una Cuenta de inversión no admite Gastos. Elige una Cuenta de gastos o de ahorro."
ACCOUNT_IS_ARCHIVED = "Esta Cuenta está archivada y no admite registros nuevos. Elige otra."
DATE_INVALID = "Escribe la fecha del gasto, por ejemplo 2026-11-16."
DATE_IN_FUTURE = "La fecha no puede ser futura. Elige hoy o un día anterior."
DATE_BEFORE_ACCOUNT = "La fecha no puede ser anterior al inicio del registro de la Cuenta ({opening_date})."
DESCRIPTION_TOO_LONG = f"La descripción admite hasta {DESCRIPTION_MAX_LENGTH} caracteres."


class StrictIntegerField(serializers.IntegerField):
    """A JSON integer: not a string, a float or a boolean."""

    def to_internal_value(self, data):
        if isinstance(data, bool) or not isinstance(data, int):
            self.fail("invalid")
        return super().to_internal_value(data)


class ExpenseSerializer(serializers.Serializer):
    """Validates an Expense; `context["user_id"]` is the User webapp authenticated.

    The Account is looked up among the User's own and locked, so a concurrent
    archive cannot slip between the check and the write. `validated_data`
    carries the Account object under `account`.
    """

    id = serializers.IntegerField(read_only=True)
    amount = DecimalStringField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
        error_messages=messages(AMOUNT_INVALID, *DECIMAL_ERRORS),
    )
    category_id = StrictIntegerField(
        error_messages=messages(CATEGORY_INVALID, "required", "null", "invalid"),
    )
    account_id = StrictIntegerField(
        error_messages=messages(ACCOUNT_REQUIRED, "required", "null", "invalid"),
    )
    date = serializers.DateField(
        required=False,
        error_messages=messages(DATE_INVALID, "null", "invalid", "datetime"),
    )
    description = serializers.CharField(
        max_length=DESCRIPTION_MAX_LENGTH,
        required=False,
        allow_blank=True,
        error_messages={**messages(DESCRIPTION_TOO_LONG, "max_length"), "invalid": DESCRIPTION_TOO_LONG},
    )

    def validate_category_id(self, value):
        if value not in CATEGORY_IDS:
            raise serializers.ValidationError(CATEGORY_INVALID)
        return value

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

    def validate(self, data):
        account = data.pop("account_id")
        # Correcting an Expense on an Account archived since is a correction of
        # history; only moving one into such an Account is a new operation.
        stays = self.instance is not None and self.instance.account_id == account.id
        if not stays:
            if account.type == Account.Type.INVESTMENT:
                raise serializers.ValidationError({"account_id": [ACCOUNT_IS_INVESTMENT]})
            if account.archived_at is not None:
                raise serializers.ValidationError({"account_id": [ACCOUNT_IS_ARCHIVED]})

        if "date" not in data:
            if self.instance is not None:
                raise serializers.ValidationError({"date": [DATE_INVALID]})
            data["date"] = clock.today()
        if data["date"] > clock.today():
            raise serializers.ValidationError({"date": [DATE_IN_FUTURE]})
        if data["date"] < account.opening_date:
            message = DATE_BEFORE_ACCOUNT.format(opening_date=account.opening_date.isoformat())
            raise serializers.ValidationError({"date": [message]})
        data["account"] = account
        return data

    def create(self, validated_data):
        return Expense.objects.create(user_id=self.context["user_id"], **validated_data)

    def update(self, instance, validated_data):
        validated_data.setdefault("description", "")
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
