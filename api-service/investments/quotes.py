"""The quotes service that finds Assets (docs/spec.md, "Activos, Posiciones y precios").

The adapter is the only code that talks to the provider; tests replace
`provider()`. Provider choice and terms: docs/adr/0006-asset-search-provider.md.
"""

import datetime
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from django.conf import settings

from accounts import clock

TWELVE_DATA = "twelvedata"
SEARCH_TIMEOUT_SECONDS = 5
# Free plan (ADR 0006): 8 credits per minute and 800 per day; a closing price costs 1 credit.
CREDITS_PER_MINUTE = 8
CREDITS_PER_DAY = 800
RATE_LIMIT_CODE = 429
MIC_CODE = re.compile(r"^[A-Z]{4}$")


class QuotesUnavailable(Exception):
    """The provider did not answer usefully: no key, no network, a limit or a bad reply."""


class QuotesRateLimited(QuotesUnavailable):
    """The provider's per-minute or per-day credits ran out; asking again now only wastes them."""


@dataclass(frozen=True)
class Closing:
    """The last closing price the provider knows for an Asset, with the day it belongs to."""

    value: Decimal
    date: datetime.date


@dataclass(frozen=True)
class AssetCandidate:
    provider: str
    market: str
    symbol: str
    name: str
    asset_type: str
    currency: str


class TwelveDataQuotes:
    def __init__(self, api_key):
        self.api_key = api_key

    def search(self, query):
        url = "https://api.twelvedata.com/symbol_search?" + urllib.parse.urlencode(
            {"symbol": query, "outputsize": 20, "apikey": self.api_key}
        )
        try:
            with urllib.request.urlopen(url, timeout=SEARCH_TIMEOUT_SECONDS) as response:
                body = json.load(response)
            rows = body["data"]
            return [self._candidate(row) for row in rows]
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError) as error:
            raise QuotesUnavailable from error

    def latest_close(self, asset):
        """The last closing of `asset`, identified by its stored market and symbol."""
        market = "mic_code" if MIC_CODE.match(asset.market) else "exchange"
        url = "https://api.twelvedata.com/time_series?" + urllib.parse.urlencode(
            {
                "symbol": asset.symbol,
                market: asset.market,
                "interval": "1day",
                "outputsize": 1,
                "apikey": self.api_key,
            }
        )
        try:
            with urllib.request.urlopen(url, timeout=SEARCH_TIMEOUT_SECONDS) as response:
                body = json.load(response)
            if body.get("code") == RATE_LIMIT_CODE:
                raise QuotesRateLimited
            row = body["values"][0]
            return Closing(
                value=Decimal(row["close"]),
                date=datetime.date.fromisoformat(row["datetime"][:10]),
            )
        except QuotesUnavailable:
            raise
        # No `from error`: urllib messages may carry the request URL, which holds the key.
        except (
            urllib.error.URLError,
            TimeoutError,
            ValueError,
            KeyError,
            IndexError,
            TypeError,
            AttributeError,
            InvalidOperation,
        ):
            raise QuotesUnavailable from None

    @staticmethod
    def _candidate(row):
        # The MIC code names the market; crypto has none, so the exchange name does.
        market = row.get("mic_code") or row["exchange"]
        return AssetCandidate(
            provider=TWELVE_DATA,
            market=market,
            symbol=row["symbol"],
            name=row.get("instrument_name") or row["symbol"],
            asset_type=row.get("instrument_type") or "",
            currency=row.get("currency") or "",
        )


SAMPLE_CATALOG = (
    AssetCandidate("sample", "XNAS", "AAPL", "Apple Inc", "Common Stock", "USD"),
    AssetCandidate("sample", "XNAS", "MSFT", "Microsoft Corp", "Common Stock", "USD"),
    AssetCandidate("sample", "ARCX", "VOO", "Vanguard S&P 500 ETF", "ETF", "USD"),
    AssetCandidate("sample", "XNYS", "SHOP", "Shopify Inc (Nueva York)", "Common Stock", "USD"),
    AssetCandidate("sample", "XTSE", "SHOP", "Shopify Inc (Toronto)", "Common Stock", "CAD"),
    AssetCandidate("sample", "Binance", "BTC/USD", "Bitcoin", "Digital Currency", "USD"),
)


SAMPLE_CLOSINGS = {
    ("XNAS", "AAPL"): Decimal("190.25"),
    ("XNAS", "MSFT"): Decimal("420.10"),
    ("ARCX", "VOO"): Decimal("510.40"),
    ("XNYS", "SHOP"): Decimal("78.30"),
    ("XTSE", "SHOP"): Decimal("105.60"),
    ("Binance", "BTC/USD"): Decimal("68000.00"),
}


class SampleQuotes:
    """A small fixed catalog for demos and browser tests; it needs no key and no network."""

    def latest_close(self, asset):
        value = SAMPLE_CLOSINGS.get((asset.market, asset.symbol))
        if value is None:
            raise QuotesUnavailable
        return Closing(value=value, date=clock.today())

    def search(self, query):
        needle = query.casefold()
        return [
            asset
            for asset in SAMPLE_CATALOG
            if needle in asset.symbol.casefold() or needle in asset.name.casefold()
        ]


def provider():
    """The configured quotes service, or None when there is none to ask."""
    if settings.QUOTES_PROVIDER == "sample":
        return SampleQuotes()
    api_key = settings.TWELVE_DATA_API_KEY
    return TwelveDataQuotes(api_key) if api_key else None
