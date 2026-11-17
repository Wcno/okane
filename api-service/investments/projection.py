"""Projection of savings and investments: a hypothetical comparison, never stored.

Each month applies `capital * (1 + annual_rate / 12) + monthly_contribution`: the
nominal annual rate divided by twelve, the contribution joining at the end of the
month, after the interest (docs/contratos.md). Everything is computed exactly and
rounded only where a figure leaves: each monthly row is rounded from the exact
capital, never from the previous rounded row.
"""

from decimal import ROUND_HALF_UP, Decimal

from rest_framework import serializers
from rest_framework.exceptions import NotFound

from accounts import clock, ledger
from accounts.models import Account
from accounts.serializers import (
    DECIMAL_ERRORS,
    TOO_LARGE_CODES,
    DecimalStringField,
    StrictIntegerField,
    messages,
)
from investments.performance import account_figures, portfolio_of
from investments.holdings import exact

CENT = Decimal("0.01")
MONTHS_IN_YEAR = Decimal(12)
SCENARIO_LIMIT = 3
LONGEST_TERM = 600
# A nominal annual rate of -1200% makes the monthly factor zero.
LOWEST_INVESTMENT_RATE = Decimal(-12)
LARGEST_CAPITAL = Decimal("999999999999.99")

PORTFOLIO = "portfolio"
ACCOUNT = "account"
CONVENTION = {"monthly_rate": "annual_rate_divided_by_12", "contribution": "end_of_month"}

SCENARIOS_INVALID = "Compara de uno a tres escenarios."
SELECTION_INVALID = "Elige una Cuenta de ahorro, una Cuenta de inversión o el portafolio."
ACCOUNT_NOT_PROJECTABLE = "Solo una Cuenta de ahorro o de inversión se proyecta. Elige una."
CAPITAL_INVALID = (
    "Escribe el capital inicial, cero o mayor, con dos decimales como máximo. Ejemplo: 1000.00"
)
CAPITAL_TOO_LARGE = "El capital es demasiado grande. El máximo es $999,999,999,999.99."
CAPITAL_NEEDED = (
    "El valor actual de la selección es negativo. Escribe un capital inicial hipotético, cero o mayor."
)
CONTRIBUTION_INVALID = (
    "Escribe el aporte mensual, cero o mayor, con dos decimales como máximo. Ejemplo: 100.00"
)
CONTRIBUTION_TOO_LARGE = "El aporte es demasiado grande. El máximo es $999,999,999,999.99."
MONTHS_INVALID = f"Escribe el plazo en meses, un número entero de 1 a {LONGEST_TERM}."
RATE_INVALID = "Escribe la tasa anual como razón decimal con hasta seis decimales. Ejemplo: 0.12"
SAVINGS_RATE_NEGATIVE = "La tasa de una Cuenta de ahorro es cero o mayor."
INVESTMENT_RATE_TOO_LOW = "Una inversión admite una tasa mayor que -1200% anual (-12)."
RESULT_TOO_LARGE = "Con estos supuestos el resultado es demasiado grande. Reduce el plazo o la tasa."


def money(value):
    return f"{value.quantize(CENT, rounding=ROUND_HALF_UP):f}"


class ScenarioSerializer(serializers.Serializer):
    initial_capital = DecimalStringField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        required=False,
        allow_null=True,
        error_messages={
            **messages(CAPITAL_INVALID, *DECIMAL_ERRORS),
            **messages(CAPITAL_TOO_LARGE, *TOO_LARGE_CODES),
        },
    )
    monthly_contribution = DecimalStringField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        error_messages={
            **messages(CONTRIBUTION_INVALID, *DECIMAL_ERRORS),
            **messages(CONTRIBUTION_TOO_LARGE, *TOO_LARGE_CODES),
        },
    )
    months = StrictIntegerField(
        min_value=1,
        max_value=LONGEST_TERM,
        error_messages=messages(
            MONTHS_INVALID, "required", "null", "invalid", "min_value", "max_value"
        ),
    )
    annual_rate = DecimalStringField(
        max_digits=12,
        decimal_places=6,
        error_messages=messages(RATE_INVALID, *DECIMAL_ERRORS, *TOO_LARGE_CODES),
    )


class SelectionSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(
        choices=[ACCOUNT, PORTFOLIO],
        error_messages=messages(SELECTION_INVALID, "required", "null", "invalid_choice"),
    )
    account_id = StrictIntegerField(
        required=False, error_messages=messages(SELECTION_INVALID, "null", "invalid")
    )

    def validate(self, attrs):
        if (attrs["kind"] == ACCOUNT) != ("account_id" in attrs):
            raise serializers.ValidationError(SELECTION_INVALID)
        return attrs


class ProjectionSerializer(serializers.Serializer):
    selection = SelectionSerializer()
    scenarios = ScenarioSerializer(many=True, allow_empty=False)

    def validate_scenarios(self, scenarios):
        if len(scenarios) > SCENARIO_LIMIT:
            raise serializers.ValidationError(SCENARIOS_INVALID)
        return scenarios


def selected_source(user_id, selection, today):
    """What the selection is worth today and where that figure comes from."""
    if selection["kind"] == PORTFOLIO:
        portfolio = portfolio_of(user_id, today)
        return {
            "kind": PORTFOLIO,
            "account": None,
            "value": Decimal(portfolio["value"]),
            "basis": "valuation",
            "estimated": portfolio["estimated"],
            "saved_annual_rate": None,
        }

    account = Account.objects.filter(user_id=user_id, pk=selection["account_id"]).first()
    if account is None:
        raise NotFound
    if account.type == Account.Type.SPENDING:
        raise serializers.ValidationError({"selection": [ACCOUNT_NOT_PROJECTABLE]})
    represented = {"id": account.id, "name": account.name, "type": account.type}
    if account.type == Account.Type.SAVINGS:
        return {
            "kind": ACCOUNT,
            "account": represented,
            "value": ledger.balances([account])[account.id],
            "basis": "balance",
            "estimated": False,
            "saved_annual_rate": account.annual_interest_rate,
        }
    figures = next(
        item for item in account_figures(user_id, today) if item["account"].id == account.id
    )
    return {
        "kind": ACCOUNT,
        "account": represented,
        "value": figures["cash"] + figures["positions_value"],
        "basis": "valuation",
        "estimated": figures["estimated"],
        "saved_annual_rate": None,
    }


@exact
def project(initial_capital, monthly_contribution, months, annual_rate):
    """The monthly series of one scenario: exact capital, rounded only on the way out."""
    monthly_rate = annual_rate / MONTHS_IN_YEAR
    capital = initial_capital
    series = []
    for month in range(1, months + 1):
        capital = capital * (1 + monthly_rate) + monthly_contribution
        if capital > LARGEST_CAPITAL:
            raise serializers.ValidationError({"scenarios": [RESULT_TOO_LARGE]})
        contributed = initial_capital + monthly_contribution * month
        series.append(
            {"month": month, "capital": money(capital), "contributed": money(contributed)}
        )
    contributed = initial_capital + monthly_contribution * months
    return {
        "contributed": money(contributed),
        "final_capital": money(capital),
        "result": money(capital - contributed),
        "series": series,
    }


def represent_scenario(scenario, source_value, savings):
    rate = scenario["annual_rate"]
    errors = {}
    if savings and rate < 0:
        errors["annual_rate"] = [SAVINGS_RATE_NEGATIVE]
    elif not savings and rate <= LOWEST_INVESTMENT_RATE:
        errors["annual_rate"] = [INVESTMENT_RATE_TOO_LOW]
    initial = scenario.get("initial_capital")
    if initial is None:
        initial = source_value
        if initial < 0:
            errors["initial_capital"] = [CAPITAL_NEEDED]
    if errors:
        raise serializers.ValidationError(errors)
    return {
        "initial_capital": money(initial),
        "monthly_contribution": money(scenario["monthly_contribution"]),
        "months": scenario["months"],
        "annual_rate": f"{rate:f}",
        **project(initial, scenario["monthly_contribution"], scenario["months"], rate),
    }


@exact
def projection_of(user_id, data):
    """Compare the scenarios against the selection. Reads only: nothing is created or changed."""
    today = clock.today()
    source = selected_source(user_id, data["selection"], today)
    savings = source["account"] is not None and source["account"]["type"] == Account.Type.SAVINGS
    scenarios = []
    for index, scenario in enumerate(data["scenarios"]):
        try:
            scenarios.append(represent_scenario(scenario, source["value"], savings))
        except serializers.ValidationError as error:
            raise serializers.ValidationError(
                {f"scenarios.{index}.{field}": found for field, found in error.detail.items()}
            ) from None
    saved_rate = source["saved_annual_rate"]
    return {
        "convention": CONVENTION,
        "source": {
            "kind": source["kind"],
            "account": source["account"],
            "value": money(source["value"]),
            "as_of": today.isoformat(),
            "basis": source["basis"],
            "estimated": source["estimated"],
            "saved_annual_rate": None if saved_rate is None else f"{saved_rate:f}",
        },
        "scenarios": scenarios,
    }
