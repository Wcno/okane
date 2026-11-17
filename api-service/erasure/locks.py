"""Serialize erasing a User against every write that User makes.

The lock key is the User's id, taken on a PostgreSQL advisory lock that is
released at the end of the transaction. Writes share it, so they never wait for
each other; erasing takes it exclusively, so it waits for writes in flight and
makes later ones wait until the tombstone is committed.
"""

from django.db import connection

from erasure.models import ErasedUser


def _acquire(function, user_id):
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT {function}(%s)", [user_id])


def lock_for_write(user_id):
    """Return whether the User may still write; call inside a transaction."""
    _acquire("pg_advisory_xact_lock_shared", user_id)
    return not ErasedUser.objects.filter(user_id=user_id).exists()


def lock_for_erasure(user_id):
    _acquire("pg_advisory_xact_lock", user_id)
