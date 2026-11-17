from django.db import migrations, models


class Migration(migrations.Migration):
    # A separate step: Postgres refuses to alter a table with pending deferred
    # constraint checks, which the data copy of 0002 leaves behind until it commits.
    dependencies = [("categories", "0002_per_user_categories")]

    operations = [
        migrations.AlterField(
            model_name="category",
            name="user_id",
            field=models.PositiveBigIntegerField(db_index=True),
        ),
    ]
