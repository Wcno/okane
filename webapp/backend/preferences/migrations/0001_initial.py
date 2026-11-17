import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserPreferences",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("movement_type", models.CharField(blank=True, default="", max_length=8)),
                ("account_id", models.PositiveBigIntegerField(blank=True, null=True)),
                ("period", models.CharField(default="current_month", max_length=13)),
                ("period_from", models.DateField(blank=True, null=True)),
                ("period_to", models.DateField(blank=True, null=True)),
                ("grouping", models.CharField(default="date", max_length=4)),
                ("hidden_sections", models.JSONField(default=list)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="preferences",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"db_table": "user_preferences"},
        ),
    ]
