from django.core.management.base import BaseCommand

from investments.prices import refresh_prices


class Command(BaseCommand):
    help = "Fetch the latest closing price of every held Asset from the quotes service."

    def handle(self, *args, **options):
        report = refresh_prices()
        self.stdout.write(
            f"updated={report.updated} skipped={report.skipped} failed={report.failed}"
            f" rate_limited={report.rate_limited}"
        )
