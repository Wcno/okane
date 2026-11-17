from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from categories.rules import has_records, owned_by, with_records
from categories.serializers import NAME_TAKEN, CategorySerializer, represent
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence

CATEGORY_HAS_RULES = "Mueve o elimina los pagos recurrentes de esta Categoría antes de archivarla."
RESTORE_NAME_TAKEN = (
    "Ya tienes una Categoría activa con ese nombre. Renómbrala o archívala antes de restaurar esta."
)
CATEGORY_HAS_PENDING = (
    "Confirma o cancela los pagos recurrentes pendientes de esta Categoría antes de archivarla."
)


def owned_category(request, category_id, lock=False):
    """The User's Category; another User's id is as absent as an unknown one."""
    categories = owned_by(request.okane_user_id).filter(pk=category_id)
    category = (categories.select_for_update() if lock else categories).first()
    if category is None:
        raise NotFound
    return category


def shown(category):
    """The Category as the API represents it, with its `has_records` flag."""
    return represent(with_records(type(category).objects.filter(pk=category.pk)).get())


def refuse(message):
    return Response({"errors": {"form": [message]}}, status=409)


def save_unique(serializer):
    """Save; a concurrent twin of the same name comes back as a conflict response."""
    try:
        with transaction.atomic():
            return serializer.save(), None
    except IntegrityError:
        return None, refuse(NAME_TAKEN)


def save_unique_instance(category):
    """Save an already validated Category; a concurrent twin of the same name is a conflict."""
    try:
        with transaction.atomic():
            category.save(update_fields=["archived_at"])
            return category, None
    except IntegrityError:
        return None, refuse(RESTORE_NAME_TAKEN)


def archive_blocker(category):
    """What must be resolved before archiving, or None."""
    if RecurringPayment.objects.filter(category=category, deleted_at__isnull=True).exists():
        return CATEGORY_HAS_RULES
    pending = RecurringPaymentOccurrence.objects.filter(
        category=category, status=RecurringPaymentOccurrence.Status.PENDING
    )
    if pending.exists():
        return CATEGORY_HAS_PENDING
    return None


def restore(category):
    """Offer the Category again, unless another active one now has its name."""
    if category.archived_at is not None:
        taken = (
            owned_by(category.user_id)
            .filter(name__iexact=category.name, archived_at__isnull=True)
            .exclude(pk=category.pk)
        )
        if taken.exists():
            return refuse(RESTORE_NAME_TAKEN)
        category.archived_at = None
        category, conflict = save_unique_instance(category)
        if conflict:
            return conflict
    return Response(shown(category))


def archive(category):
    """Archive, or return the response that says what must be resolved first."""
    if category.archived_at is None:
        blocker = archive_blocker(category)
        if blocker:
            return refuse(blocker)
        category.archived_at = timezone.now()
        category.save(update_fields=["archived_at"])
    return Response(shown(category))


@api_view(["GET", "POST"])
@transaction.atomic
def category_collection(request):
    user_id = request.okane_user_id
    if request.method == "POST":
        serializer = CategorySerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        category, conflict = save_unique(serializer)
        return conflict or Response(shown(category), status=201)
    return Response({"results": [represent(item) for item in with_records(owned_by(user_id))]})


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def category_detail(request, category_id):
    category = owned_category(request, category_id, lock=request.method != "GET")
    if request.method == "DELETE":
        # Deleting a Category with records would rewrite history, so it is archived (like Accounts).
        if not has_records(category):
            category.delete()
            return Response(status=204)
        return archive(category)
    if request.method == "PUT":
        serializer = CategorySerializer(
            category, data=request.data, context={"user_id": request.okane_user_id}
        )
        serializer.is_valid(raise_exception=True)
        category, conflict = save_unique(serializer)
        if conflict:
            return conflict
    return Response(shown(category))


@api_view(["POST"])
@transaction.atomic
def category_archive(request, category_id):
    return archive(owned_category(request, category_id, lock=True))


@api_view(["POST"])
@transaction.atomic
def category_restore(request, category_id):
    return restore(owned_category(request, category_id, lock=True))
