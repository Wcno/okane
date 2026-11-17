from django.apps import AppConfig


class ExpensesConfig(AppConfig):
    name = "expenses"

    def ready(self):
        from accounts import ledger
        from expenses.ledger_source import ExpenseLedgerSource

        ledger.register(ExpenseLedgerSource())
