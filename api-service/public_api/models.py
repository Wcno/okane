from django.db import models


class IdempotencyRecord(models.Model):
    """The answer of a write of the public API, kept to repeat it for the same key.

    It is written in the transaction of the record it answers, so either both
    exist or neither does. The key belongs to the User and the operation, not to
    the token that sent it, and it outlives the record it created.
    """

    # Users live in webapp-db, so this is the identifier webapp sends, not a foreign key.
    user_id = models.PositiveBigIntegerField()
    operation = models.CharField(max_length=40)
    key = models.CharField(max_length=255)
    # SHA-256 of the canonical content: another body for the same key is a conflict.
    fingerprint = models.CharField(max_length=64)
    status_code = models.PositiveSmallIntegerField()
    body = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "idempotency_records"
        constraints = [
            models.UniqueConstraint(
                fields=["user_id", "operation", "key"], name="idempotency_one_per_user_operation_key"
            )
        ]
