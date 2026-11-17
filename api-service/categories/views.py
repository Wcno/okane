from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from categories.rules import visible_to
from categories.serializers import NAME_TAKEN, CategorySerializer, represent
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence

INITIAL_IS_FIXED = "Las Categorías iniciales no se pueden editar ni archivar."
CATEGORY_HAS_RULES = "Mueve o elimina los pagos recurrentes de esta Categoría antes de archivarla."
CATEGORY_HAS_PENDING = (
    "Confirma o cancela los pagos recurrentes pendientes de esta Categoría antes de archivarla."
)


def visible_category(request, category_id, lock=False):
    """A Category of the catalog or of the User; another User's id is as absent as an unknown one."""
    categories = visible_to(request.okane_user_id).filter(pk=category_id)
    category = (categories.select_for_update() if lock else categories).first()
    if category is None:
        raise NotFound
    return category


def refuse(message):
    return Response({"errors": {"form": [message]}}, status=409)


def save_unique(serializer):
    """Save; a concurrent twin of the same name comes back as a conflict response."""
    try:
        with transaction.atomic():
            return serializer.save(), None
    except IntegrityError:
        return None, refuse(NAME_TAKEN)


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


@api_view(["GET", "POST"])
@transaction.atomic
def category_collection(request):
    user_id = request.okane_user_id
    if request.method == "POST":
        serializer = CategorySerializer(data=request.data, context={"user_id": user_id})
        serializer.is_valid(raise_exception=True)
        category, conflict = save_unique(serializer)
        return conflict or Response(represent(category), status=201)
    return Response({"results": [represent(category) for category in visible_to(user_id)]})


@api_view(["GET", "PUT"])
@transaction.atomic
def category_detail(request, category_id):
    category = visible_category(request, category_id, lock=request.method == "PUT")
    if request.method == "PUT":
        if not category.is_custom:
            return refuse(INITIAL_IS_FIXED)
        serializer = CategorySerializer(
            category, data=request.data, context={"user_id": request.okane_user_id}
        )
        serializer.is_valid(raise_exception=True)
        category, conflict = save_unique(serializer)
        if conflict:
            return conflict
    return Response(represent(category))


@api_view(["POST"])
@transaction.atomic
def category_archive(request, category_id):
    category = visible_category(request, category_id, lock=True)
    if not category.is_custom:
        return refuse(INITIAL_IS_FIXED)
    if category.archived_at is None:
        blocker = archive_blocker(category)
        if blocker:
            return refuse(blocker)
        category.archived_at = timezone.now()
        category.save(update_fields=["archived_at"])
    return Response(represent(category))
