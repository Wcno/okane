import datetime

from django.db import transaction
from django.db.models import Q
from rest_framework import exceptions
from rest_framework.exceptions import NotFound
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts import clock, ledger
from config.rest import paginate
from investments import quotes
from investments.models import Asset, InvestmentTransaction, QuotedPrice, ReferencePrice
from investments.performance import dashboard_of, performance_of
from investments.positions import (
    positions_of,
    reference_price,
    represent_asset,
    represent_price,
)
from investments.serializers import InvestmentTransactionSerializer, ReferencePriceSerializer

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


def record(request, kind):
    with transaction.atomic():
        serializer = InvestmentTransactionSerializer(
            data=request.data, context={"user_id": request.okane_user_id, "type": kind}
        )
        serializer.is_valid(raise_exception=True)
        created = serializer.save()
        balance = ledger.balances([created.account])[created.account_id]
    body = {**InvestmentTransactionSerializer(created).data, "account_balance": f"{balance:.2f}"}
    return Response(body, status=201)


@api_view(["POST"])
def buy(request):
    return record(request, InvestmentTransaction.Type.BUY)


@api_view(["POST"])
def sell(request):
    return record(request, InvestmentTransaction.Type.SELL)


def requested_day(request):
    """The closing a read asks for: today, or the `as_of` day, never a future one."""
    as_of = clock.today()
    if "as_of" in request.query_params:
        try:
            as_of = datetime.date.fromisoformat(request.query_params["as_of"])
        except ValueError:
            raise exceptions.ValidationError({"as_of": [AS_OF_INVALID]}) from None
        if as_of > clock.today():
            raise exceptions.ValidationError({"as_of": [AS_OF_IN_FUTURE]})
    return as_of


@api_view(["GET"])
def positions(request):
    as_of = requested_day(request)
    items, page = paginate(request, positions_of(request.okane_user_id, as_of))
    return Response({"results": items, "as_of": as_of.isoformat(), **page})


@api_view(["GET"])
def dashboard(request):
    return Response(dashboard_of(request.okane_user_id, requested_day(request)))


@api_view(["GET"])
def performance(request):
    return Response(performance_of(request.okane_user_id, requested_day(request)))


def current_price(user_id, asset):
    """The price the User's valuations use today, or None when there is nothing to base one on."""
    today = clock.today()
    manual = (
        ReferencePrice.objects.filter(user_id=user_id, asset=asset, date__lte=today)
        .order_by("-date")
        .first()
    )
    quoted = QuotedPrice.objects.filter(asset=asset, date__lte=today).order_by("-date").first()
    last = (
        InvestmentTransaction.objects.filter(user_id=user_id, asset=asset, date__lte=today)
        .order_by("-date", "-id")
        .first()
    )
    return reference_price(last, manual, quoted)


def represent_asset_price(user_id, asset):
    price = current_price(user_id, asset)
    return {
        "asset": represent_asset(asset),
        "price": None if price is None else represent_price(price),
    }


@api_view(["GET", "PUT"])
def asset_price(request, asset_id):
    """Read or correct the User's Reference Price of an Asset; it never touches another User's."""
    asset = Asset.objects.filter(pk=asset_id).first()
    if asset is None:
        raise NotFound
    if request.method == "PUT":
        serializer = ReferencePriceSerializer(
            data=request.data, context={"user_id": request.okane_user_id, "asset": asset}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(represent_asset_price(request.okane_user_id, asset))
