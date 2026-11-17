from django.apps import AppConfig


class TransfersConfig(AppConfig):
    name = "transfers"

    def ready(self):
        from accounts import ledger
        from transfers.ledger_source import TransferLedgerSource

        ledger.register(TransferLedgerSource())
