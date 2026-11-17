from django.apps import AppConfig


class IncomesConfig(AppConfig):
    name = "incomes"

    def ready(self):
        from accounts import ledger
        from incomes.ledger_source import IncomeLedgerSource

        ledger.register(IncomeLedgerSource())
