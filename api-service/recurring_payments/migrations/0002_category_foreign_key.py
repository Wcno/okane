import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("categories", "0001_initial"),
        ("recurring_payments", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(model_name="recurringpayment", name="recurring_payment_category_in_catalog"),
        migrations.RenameField(model_name="recurringpayment", old_name="category_id", new_name="category"),
        migrations.AlterField(
            model_name="recurringpayment",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="categories.category",
            ),
        ),
        migrations.RenameField(model_name="recurringpaymentoccurrence", old_name="category_id", new_name="category"),
        migrations.AlterField(
            model_name="recurringpaymentoccurrence",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="categories.category",
            ),
        ),
    ]
