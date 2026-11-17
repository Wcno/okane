from django.db import transaction

from accounts.models import Account
from erasure.locks import lock_for_erasure
from erasure.models import ErasedUser
from budgets.models import Budget
from expenses.models import Expense
from incomes.models import Income
from investments.models import InvestmentTransaction, ReferencePrice
from public_api.models import IdempotencyRecord
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence
from transfers.models import Transfer

# Children before parents: an Account with Expenses is protected from deletion.
# Every module that stores data per User adds its model here;
# `ErasureCoverageTests` fails until it does.
ERASED_MODELS = (
    RecurringPaymentOccurrence,
    RecurringPayment,
    Budget,
    Expense,
    Income,
    Transfer,
    InvestmentTransaction,
    ReferencePrice,
    IdempotencyRecord,
    Account,
)


@transaction.atomic
def erase_user_data(user_id):
    """Delete everything the User owns; safe to repeat and to run concurrently."""
    lock_for_erasure(user_id)
    for model in ERASED_MODELS:
        model.objects.filter(user_id=user_id).delete()
    ErasedUser.objects.get_or_create(user_id=user_id)
