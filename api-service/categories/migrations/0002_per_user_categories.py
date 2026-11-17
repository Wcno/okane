from django.db import migrations, models

# The fixed catalog seeded by 0001: id -> (key, name). Frozen here on purpose.
INITIAL_CATALOG = {
    1: ("housing", "Vivienda"),
    2: ("food", "Alimentación"),
    3: ("transport", "Transporte"),
    4: ("utilities", "Servicios"),
    5: ("health", "Salud"),
    6: ("entertainment", "Entretenimiento"),
    7: ("education", "Educación"),
    8: ("other", "Otros"),
}

REFERENCING = [
    ("expenses", "Expense"),
    ("budgets", "Budget"),
    ("recurring_payments", "RecurringPayment"),
    ("recurring_payments", "RecurringPaymentOccurrence"),
]


def copy_catalog_per_user(apps, schema_editor):
    """Give each existing User their own copy of the catalog and point their records at it.

    A User is known to api-service only through what they recorded, so those are
    the Users that get a copy; everyone else gets theirs on first use.
    """
    category = apps.get_model("categories", "Category")
    marker = apps.get_model("categories", "InitialCatalogCopy")
    models_by_name = [apps.get_model(app, name) for app, name in REFERENCING]
    user_ids = set(apps.get_model("accounts", "Account").objects.values_list("user_id", flat=True))
    for model in models_by_name:
        user_ids.update(model.objects.values_list("user_id", flat=True))

    for user_id in sorted(user_ids):
        marker.objects.create(user_id=user_id)
        copies = {
            old_id: category.objects.create(user_id=user_id, key=key, name=name)
            for old_id, (key, name) in INITIAL_CATALOG.items()
        }
        for model in models_by_name:
            for old_id, copy in copies.items():
                model.objects.filter(user_id=user_id, category_id=old_id).update(category_id=copy.pk)
    category.objects.filter(user_id__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("categories", "0001_initial"),
        ("expenses", "0002_category_foreign_key"),
        ("budgets", "0002_category_foreign_key"),
        ("recurring_payments", "0002_category_foreign_key"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="key",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=("user_id", "key"), name="category_initial_once_per_user"
            ),
        ),
        migrations.CreateModel(
            name="InitialCatalogCopy",
            fields=[
                ("user_id", models.PositiveBigIntegerField(primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.RunPython(copy_catalog_per_user, migrations.RunPython.noop),
    ]
