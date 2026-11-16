"""Limit on failed logins per email and per origin (docs/contratos.md).

After MAX_FAILURES failures in a row within WINDOW for an email or from an
origin, every login for it is refused until the oldest of those failures
leaves the window. A successful login clears its email and origin. The limit
never reveals whether an email exists: unknown emails are counted the same way.
"""

import math
from datetime import timedelta

from django.utils import timezone

from users.models import LoginFailure

MAX_FAILURES = 5
WINDOW = timedelta(minutes=15)


KEY_LENGTH = LoginFailure._meta.get_field("key").max_length


def _keys(email, origin):
    # No real email is longer than the column; a longer one still counts.
    return (
        (LoginFailure.Scope.EMAIL, email[:KEY_LENGTH]),
        (LoginFailure.Scope.ORIGIN, origin),
    )


def seconds_until_allowed(email, origin):
    """Return how long the login must wait, or 0 when it may proceed."""
    now = timezone.now()
    wait = 0
    for scope, key in _keys(email, origin):
        recent = LoginFailure.objects.filter(
            scope=scope, key=key, failed_at__gt=now - WINDOW
        ).order_by("-failed_at")
        failures = list(recent.values_list("failed_at", flat=True)[:MAX_FAILURES])
        if len(failures) == MAX_FAILURES:
            # The limit lifts when the oldest of the last five failures expires.
            released_at = failures[-1] + WINDOW
            wait = max(wait, math.ceil((released_at - now).total_seconds()))
    return wait


def record_failure(email, origin):
    now = timezone.now()
    LoginFailure.objects.filter(failed_at__lte=now - WINDOW).delete()
    LoginFailure.objects.bulk_create(
        LoginFailure(scope=scope, key=key, failed_at=now) for scope, key in _keys(email, origin)
    )


def clear_failures(email, origin):
    for scope, key in _keys(email, origin):
        LoginFailure.objects.filter(scope=scope, key=key).delete()
