import datetime

from django.db import transaction
from django.db.models import Q
from rest_framework import exceptions
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from accounts import clock, ledger
from accounts.models import Account
from config.rest import paginate
from investments import quotes
from investments.chronology import DELETE_LEAVES_SALE_SHORT, first_shortfall, history
from investments.models import Asset, InvestmentTransaction
from investments.positions import positions_of, represent_asset
from investments.serializers import InvestmentTransactionSerializer

SEARCH_RESULT_LIMIT = 20
# Keep equal to ASSET_QUERY_MAX_LENGTH in webapp/frontend/src/investments/api.ts.
QUERY_MAX_LENGTH = 60
QUERY_REQUIRED = "Escribe el símbolo o el nombre del Activo, por ejemplo AAPL."
QUERY_TOO_LONG = f"La búsqueda admite hasta {QUERY_MAX_LENGTH} caracteres."
AS_OF_INVALID = "Escribe la fecha del cierre, por ejemplo 2026-11-16."
AS_OF_IN_FUTURE = "El cierre no puede ser una fecha futura."


def remember(candidates):
    """Keep what the provider found in the catalog, once per provider, market and symbol."""
    for candidate in candidates:
        Asset.objects.get_or_create(
            provider=candidate.provider,
            market=candidate.market,
            symbol=candidate.symbol,
            defaults={
                "name": candidate.name,
                "asset_type": candidate.asset_type,
                "currency": candidate.currency,
            },
        )


@api_view(["GET"])
def asset_search(request):
    """Find Assets by symbol or name: the provider's answer joins the catalog, which always answers."""
    query = request.query_params.get("q", "").strip()
    if not query:
        raise exceptions.ValidationError({"q": [QUERY_REQUIRED]})
    if len(query) > QUERY_MAX_LENGTH:
        raise exceptions.ValidationError({"q": [QUERY_TOO_LONG]})

    service = quotes.provider()
    available = False
    if service is not None:
        try:
            remember(service.search(query))
            available = True
        except quotes.QuotesUnavailable:
            pass

    matches = Asset.objects.filter(Q(symbol__icontains=query) | Q(name__icontains=query))
    # Exact symbols first, then the rest in catalog order.
    exact_first = sorted(matches, key=lambda asset: asset.symbol.casefold() != query.casefold())
    return Response(
        {
            "results": [represent_asset(asset) for asset in exact_first[:SEARCH_RESULT_LIMIT]],
            "provider_available": available,
        }
    )


def with_balance(recorded, status=200):
    """The operation as api-service answers a write: with the Balance its Account has now."""
    balance = ledger.balances([recorded.account])[recorded.account_id]
    body = {**InvestmentTransactionSerializer(recorded).data, "account_balance": f"{balance:.2f}"}
    return Response(body, status=status)


def record(request, kind):
    with transaction.atomic():
        serializer = InvestmentTransactionSerializer(
            data=request.data, context={"user_id": request.okane_user_id, "type": kind}
        )
        serializer.is_valid(raise_exception=True)
        return with_balance(serializer.save(), status=201)


@api_view(["POST"])
def buy(request):
    return record(request, InvestmentTransaction.Type.BUY)


@api_view(["POST"])
def sell(request):
    return record(request, InvestmentTransaction.Type.SELL)


def represented(recorded):
    """An operation as the list and the read-one screens show it: with the Asset it refers to."""
    return {**InvestmentTransactionSerializer(recorded).data, "asset": represent_asset(recorded.asset)}


def owned_transaction(request, transaction_id, lock=False):
    """The User's operation; another User's id is as absent as an unknown one."""
    records = InvestmentTransaction.objects.filter(user_id=request.okane_user_id, pk=transaction_id)
    recorded = (records.select_for_update() if lock else records.select_related("asset")).first()
    if recorded is None:
        raise NotFound
    return recorded


def lock_investment_accounts(user_id):
    """Holds every investment Account of the User until the change ends, always in the same order.

    A change may move a record between Accounts or delete one, so it cannot lock
    only the Account it starts in. The fixed order keeps two changes from waiting
    on each other.
    """
    list(
        Account.objects.select_for_update()
        .filter(user_id=user_id, type=Account.Type.INVESTMENT)
        .order_by("id")
        .values_list("id", flat=True)
    )


@api_view(["GET"])
def transaction_collection(request):
    records = (
        InvestmentTransaction.objects.filter(user_id=request.okane_user_id)
        .select_related("asset")
        .order_by("-date", "-id")
    )
    items, page = paginate(request, records)
    return Response({"results": [represented(item) for item in items], **page})


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def transaction_detail(request, transaction_id):
    user_id = request.okane_user_id
    if request.method == "GET":
        return Response(represented(owned_transaction(request, transaction_id)))

    lock_investment_accounts(user_id)
    recorded = owned_transaction(request, transaction_id, lock=True)
    if request.method == "PUT":
        serializer = InvestmentTransactionSerializer(
            recorded, data=request.data, context={"user_id": user_id, "type": recorded.type}
        )
        serializer.is_valid(raise_exception=True)
        return with_balance(serializer.save())

    shortfall = first_shortfall(
        history(user_id, recorded.account_id, recorded.asset_id, except_id=recorded.pk)
    )
    if shortfall is not None:
        raise exceptions.ValidationError(shortfall.explain(DELETE_LEAVES_SALE_SHORT))
    recorded.delete()
    return Response(status=204)


@api_view(["GET"])
def positions(request):
    as_of = clock.today()
    if "as_of" in request.query_params:
        try:
            as_of = datetime.date.fromisoformat(request.query_params["as_of"])
        except ValueError:
            raise exceptions.ValidationError({"as_of": [AS_OF_INVALID]}) from None
        if as_of > clock.today():
            raise exceptions.ValidationError({"as_of": [AS_OF_IN_FUTURE]})
    items, page = paginate(request, positions_of(request.okane_user_id, as_of))
    return Response({"results": items, "as_of": as_of.isoformat(), **page})
