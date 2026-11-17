from django.core.management.color import no_style
from django.db import connection, migrations, models
from django.db.models import Q
from django.db.models.functions import Lower

INITIAL_CATALOG = [
    (1, "Vivienda"),
    (2, "Alimentación"),
    (3, "Transporte"),
    (4, "Servicios"),
    (5, "Salud"),
    (6, "Entretenimiento"),
    (7, "Educación"),
    (8, "Otros"),
]


def seed_initial_catalog(apps, schema_editor):
    """The ids are the ones every Expense and Budget already stores; they never change."""
    category = apps.get_model("categories", "Category")
    category.objects.bulk_create([category(id=pk, name=name) for pk, name in INITIAL_CATALOG])
    with connection.cursor() as cursor:
        for statement in connection.ops.sequence_reset_sql(no_style(), [category]):
            cursor.execute(statement)


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user_id", models.PositiveBigIntegerField(blank=True, db_index=True, null=True)),
                ("name", models.CharField(max_length=40)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name_plural": "categories",
                "ordering": ["id"],
                "constraints": [
                    models.UniqueConstraint(
                        Lower("name"),
                        models.F("user_id"),
                        condition=Q(archived_at__isnull=True),
                        name="category_active_name_per_user",
                    )
                ],
            },
        ),
        migrations.RunPython(seed_initial_catalog, migrations.RunPython.noop),
    ]
