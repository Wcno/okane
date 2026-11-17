import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("categories", "0001_initial"),
        ("expenses", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(model_name="expense", name="expense_category_in_catalog"),
        migrations.RenameField(model_name="expense", old_name="category_id", new_name="category"),
        migrations.AlterField(
            model_name="expense",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="categories.category",
            ),
        ),
    ]
