from django.apps import AppConfig


class InvestmentsConfig(AppConfig):
    name = "investments"

    def ready(self):
        from accounts import ledger
        from investments.ledger_source import InvestmentLedgerSource

        ledger.register(InvestmentLedgerSource())
