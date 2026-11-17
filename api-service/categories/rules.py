"""Which Categories a User may put on a new record (docs/contratos.md)."""

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from categories.models import Category


def visible_to(user_id):
    """The initial catalog and the User's own Categories, archived or not."""
    return Category.objects.filter(Q(user_id__isnull=True) | Q(user_id=user_id))


def assignable(user_id, category_id, *, unchanged_from=None, invalid, archived):
    """Validate `category_id` for a record and return it.

    Another User's Category is as absent as an unknown one. An archived one is
    refused, except when a record already holding it is only being corrected
    (`unchanged_from` is its current id): correcting history is not a new use.
    The row is locked so an archive cannot slip between the check and the write.
    """
    category = visible_to(user_id).select_for_update().filter(pk=category_id).first()
    if category is None:
        raise ValidationError(invalid)
    if category.archived_at is not None and category_id != unchanged_from:
        raise ValidationError(archived)
    return category_id
