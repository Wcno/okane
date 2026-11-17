"""Which Categories a User may put on a new record (docs/contratos.md)."""

from django.db.models import Exists, OuterRef
from rest_framework.exceptions import ValidationError

from budgets.models import Budget
from categories.models import Category
from categories.provisioning import ensure_initial_catalog
from expenses.models import Expense
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence


def owned_by(user_id):
    """The User's Categories, archived or not; they start with the initial catalog."""
    ensure_initial_catalog(user_id)
    return Category.objects.filter(user_id=user_id)


REFERENCING = (Expense, Budget, RecurringPayment, RecurringPaymentOccurrence)


def with_records(categories):
    """Annotate `has_records`: an Expense, Budget, rule or reservation still refers to it."""
    exists = [Exists(model.objects.filter(category=OuterRef("pk"))) for model in REFERENCING]
    return categories.annotate(has_records=exists[0] | exists[1] | exists[2] | exists[3])


def has_records(category):
    return any(model.objects.filter(category=category).exists() for model in REFERENCING)


def assignable(user_id, category_id, *, unchanged_from=None, invalid, archived):
    """Validate `category_id` for a record and return it.

    Another User's Category is as absent as an unknown one. An archived one is
    refused, except when a record already holding it is only being corrected
    (`unchanged_from` is its current id): correcting history is not a new use.
    The row is locked so an archive cannot slip between the check and the write.
    """
    category = owned_by(user_id).select_for_update().filter(pk=category_id).first()
    if category is None:
        raise ValidationError(invalid)
    if category.archived_at is not None and category_id != unchanged_from:
        raise ValidationError(archived)
    return category_id
