from django.apps import AppConfig


class RecurringPaymentsConfig(AppConfig):
    name = "recurring_payments"

    def ready(self):
        from accounts import ledger
        from recurring_payments.ledger_source import RecurringPaymentLedgerSource

        ledger.register(RecurringPaymentLedgerSource())
