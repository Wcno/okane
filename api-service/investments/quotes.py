"""The quotes service that finds Assets (docs/spec.md, "Activos, Posiciones y precios").

The adapter is the only code that talks to the provider; tests replace
`provider()`. Provider choice and terms: docs/adr/0006-asset-search-provider.md.
"""

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from django.conf import settings

TWELVE_DATA = "twelvedata"
SEARCH_TIMEOUT_SECONDS = 5


class QuotesUnavailable(Exception):
    """The provider did not answer usefully: no key, no network, a limit or a bad reply."""


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


class SampleQuotes:
    """A small fixed catalog for demos and browser tests; it needs no key and no network."""

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
