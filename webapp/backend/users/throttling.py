"""Limits on login and password recovery attempts (docs/contratos.md).

After MAX_ATTEMPTS counted attempts in a row within WINDOW for an email or
from an origin, the action is refused for it until the oldest of those
attempts leaves the window. Each action keeps its own count. A limit never
reveals whether an email exists: unknown emails are counted the same way.
"""

import math
from datetime import timedelta

from django.utils import timezone

from users.models import AccessAttempt

MAX_ATTEMPTS = 5
WINDOW = timedelta(minutes=15)


KEY_LENGTH = AccessAttempt._meta.get_field("key").max_length


class AttemptLimit:
    def __init__(self, action, *, by_email=True):
        self.action = action
        self.by_email = by_email

    def _keys(self, email, origin):
        # No real email is longer than the column; a longer one still counts.
        keys = ((AccessAttempt.Scope.ORIGIN, origin),)
        if self.by_email:
            keys = ((AccessAttempt.Scope.EMAIL, email[:KEY_LENGTH]),) + keys
        return keys

    def seconds_until_allowed(self, email, origin):
        """Return how long the action must wait, or 0 when it may proceed."""
        now = timezone.now()
        wait = 0
        for scope, key in self._keys(email, origin):
            recent = AccessAttempt.objects.filter(
                action=self.action, scope=scope, key=key, attempted_at__gt=now - WINDOW
            ).order_by("-attempted_at")
            attempts = list(recent.values_list("attempted_at", flat=True)[:MAX_ATTEMPTS])
            if len(attempts) == MAX_ATTEMPTS:
                # The limit lifts when the oldest of the last five attempts expires.
                released_at = attempts[-1] + WINDOW
                wait = max(wait, math.ceil((released_at - now).total_seconds()))
        return wait

    def record(self, email, origin):
        now = timezone.now()
        AccessAttempt.objects.filter(attempted_at__lte=now - WINDOW).delete()
        AccessAttempt.objects.bulk_create(
            AccessAttempt(action=self.action, scope=scope, key=key, attempted_at=now)
            for scope, key in self._keys(email, origin)
        )

    def clear(self, email, origin):
        for scope, key in self._keys(email, origin):
            AccessAttempt.objects.filter(action=self.action, scope=scope, key=key).delete()


# Only failed logins count, and a successful one clears its email and origin.
login_limit = AttemptLimit(AccessAttempt.Action.LOGIN)
# Every request for a reset link counts, since none of them can be told apart;
# using a link clears its email and origin.
recovery_limit = AttemptLimit(AccessAttempt.Action.PASSWORD_RECOVERY)
# A token that does not exist or was revoked counts against the address that sent it.
invalid_token_limit = AttemptLimit(AccessAttempt.Action.INVALID_TOKEN, by_email=False)
