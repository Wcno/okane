"""The initial Categories every User starts from (docs/contratos.md).

api-service has no sign-up hook, so a User's copy is made the first time their
Categories are needed. The check is one query; the marker's primary key makes
two simultaneous first requests harmless: one waits for the other's commit.
"""

from django.db import transaction

from categories.models import Category, InitialCatalogCopy

INITIAL_CATALOG = [
    ("housing", "Vivienda"),
    ("food", "Alimentación"),
    ("transport", "Transporte"),
    ("utilities", "Servicios"),
    ("health", "Salud"),
    ("entertainment", "Entretenimiento"),
    ("education", "Educación"),
    ("other", "Otros"),
]


def ensure_initial_catalog(user_id):
    if InitialCatalogCopy.objects.filter(pk=user_id).exists():
        return
    with transaction.atomic():
        _, created = InitialCatalogCopy.objects.get_or_create(pk=user_id)
        if created:
            Category.objects.bulk_create(
                [Category(user_id=user_id, key=key, name=name) for key, name in INITIAL_CATALOG]
            )
