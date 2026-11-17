from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

NAME_MAX_LENGTH = 40


class Category(models.Model):
    """What an Expense or Budget is about (GLOSSARY.md, Categoría).

    The initial catalog has no owner (`user_id` is null): every User sees it
    with the same stable ids 1 to 8. A User's own Categories carry that User.
    """

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    name = models.CharField(max_length=NAME_MAX_LENGTH)
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
        ]

    @property
    def is_custom(self):
        return self.user_id is not None
