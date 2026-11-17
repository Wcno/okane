"""Refreshing the quoted closing prices of the Assets people hold (ticket #23).

The prices are public, so each Asset is asked once per run whatever the number of
Users holding it, and a manual Reference Price stays the User's own. The provider's
credits are limited (ADR 0006), so the run spaces its requests and stops when the
provider says they are spent. When the service fails, the stored prices stay: the
last known one keeps being used, with its date.
"""

import logging
import time
from dataclasses import dataclass

from django.utils import timezone

from accounts import clock
from investments import quotes
from investments.models import Asset, InvestmentTransaction, QuotedPrice

logger = logging.getLogger(__name__)

SECONDS_BETWEEN_REQUESTS = 60 / quotes.CREDITS_PER_MINUTE


@dataclass
class RefreshReport:
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    rate_limited: bool = False


def held_assets():
    """Assets someone has bought: the only ones whose price a valuation needs."""
    ids = InvestmentTransaction.objects.values("asset_id").distinct()
    return list(Asset.objects.filter(id__in=ids).order_by("id"))


def quoted_today(asset, today):
    latest = asset.quoted_prices.order_by("-fetched_at").first()
    return latest is not None and timezone.localdate(latest.fetched_at) == today


def refresh_prices(service=None, sleep=time.sleep, max_requests=quotes.CREDITS_PER_DAY):
    """Fetch the latest closing of every held Asset once a day; never raises for a provider fault."""
    report = RefreshReport()
    service = service or quotes.provider()
    if service is None or not hasattr(service, "latest_close"):
        logger.warning("No quotes service is configured; prices keep their last known value.")
        return report
    today = clock.today()
    requests = 0
    for asset in held_assets():
        if quoted_today(asset, today):
            report.skipped += 1
            continue
        if requests >= max_requests:
            break
        if requests:
            sleep(SECONDS_BETWEEN_REQUESTS)
        requests += 1
        try:
            closing = service.latest_close(asset)
        except quotes.QuotesRateLimited:
            logger.warning("The quotes service limit is spent; stopping this run.")
            report.rate_limited = True
            break
        except quotes.QuotesUnavailable:
            logger.warning("No closing price for asset %s; keeping its last known one.", asset.id)
            report.failed += 1
            continue
        if not store(asset, closing, today):
            report.failed += 1
            continue
        report.updated += 1
    return report


def store(asset, closing, today):
    """Save one closing with its own date; refuse a future date or a value that is not positive."""
    if closing.date > today or closing.value <= 0:
        logger.warning("Ignoring an unusable closing price for asset %s.", asset.id)
        return False
    QuotedPrice.objects.update_or_create(
        asset=asset,
        date=closing.date,
        defaults={"value": closing.value, "provider": asset.provider},
    )
    return True
