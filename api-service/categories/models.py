from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

NAME_MAX_LENGTH = 40


class InitialCatalogCopy(models.Model):
    """Marks a User who already has their copy of the initial catalog.

    Without it, a User who deleted every Category would get the catalog back.
    """

    user_id = models.PositiveBigIntegerField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Category(models.Model):
    """What an Expense or Budget is about (GLOSSARY.md, Categoría).

    Every User owns their Categories, the initial eight included: each User
    gets a copy the first time api-service needs their Categories
    (`categories.provisioning`). The copies carry a `key` that fixes their icon
    and hue in the interface; Categories the User creates have none. Ids are
    per Category, never shared between Users.
    """

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField(db_index=True)
    name = models.CharField(max_length=NAME_MAX_LENGTH)
    # Which of the initial Categories this is a copy of; null for the User's own.
    key = models.CharField(max_length=20, null=True, blank=True)
    # An archived Category is never offered for new records; its history stays.
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name_plural = "categories"
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "user_id",
                condition=Q(archived_at__isnull=True),
                name="category_active_name_per_user",
            ),
            models.UniqueConstraint(fields=["user_id", "key"], name="category_initial_once_per_user"),
        ]
