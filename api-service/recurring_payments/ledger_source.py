from accounts.models import Account
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence

ACCOUNT_HAS_RULES = "Mueve o elimina los pagos recurrentes de esta Cuenta antes de archivarla."
ACCOUNT_HAS_PENDING = (
    "Confirma o cancela los pagos recurrentes pendientes de esta Cuenta antes de archivarla."
)


class RecurringPaymentLedgerSource:
    """Reservations move no money, but they refer to Accounts and block archiving them."""

    def balance_changes(self, account_ids):
        return {}

    def accounts_with_records(self, account_ids):
        rules = RecurringPayment.objects.filter(account_id__in=account_ids)
        occurrences = RecurringPaymentOccurrence.objects.filter(account_id__in=account_ids)
        return set(rules.values_list("account_id", flat=True)) | set(
            occurrences.values_list("account_id", flat=True)
        )

    def archive_blockers(self, account: Account):
        blockers = []
        if RecurringPayment.objects.filter(account=account, deleted_at__isnull=True).exists():
            blockers.append(ACCOUNT_HAS_RULES)
        pending = RecurringPaymentOccurrence.objects.filter(
            account=account, status=RecurringPaymentOccurrence.Status.PENDING
        )
        if pending.exists():
            blockers.append(ACCOUNT_HAS_PENDING)
        return blockers
