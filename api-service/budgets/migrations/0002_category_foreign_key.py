import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("categories", "0001_initial"),
        ("budgets", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(model_name="budget", name="budget_category_in_catalog"),
        migrations.RenameField(model_name="budget", old_name="category_id", new_name="category"),
        migrations.AlterField(
            model_name="budget",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="categories.category",
            ),
        ),
    ]
