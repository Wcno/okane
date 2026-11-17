from django.db import models


class ErasedUser(models.Model):
    """A User whose financial data was erased; later writes for that id are refused."""

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField(unique=True)
    erased_at = models.DateTimeField(auto_now_add=True)
