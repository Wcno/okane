"""Personal access tokens for `/api/v1` (docs/contratos.md, "API pública autenticada").

A token looks like `okt_<prefix>_<secret>`. The secret is random and only its
SHA-256 hash is stored; the hash is compared in constant time.
"""

import hashlib
import hmac
import math
import secrets
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from users.models import PersonalToken, TokenRequest

TOKEN_MARK = "okt"
PREFIX_BYTES = 4
SECRET_BYTES = 32
REQUESTS_PER_MINUTE = 120
WINDOW = timedelta(minutes=1)

# What an unknown prefix is compared with, so it takes as long as a known one.
_DECOY_HASH = hashlib.sha256(b"no such token").hexdigest()


def _hash(secret):
    return hashlib.sha256(secret.encode()).hexdigest()


def issue(user, name, scopes):
    """Create a token; return it with the one and only readable copy of its secret."""
    while True:
        prefix = secrets.token_hex(PREFIX_BYTES)
        secret = secrets.token_urlsafe(SECRET_BYTES)
        try:
            with transaction.atomic():
                token = PersonalToken.objects.create(
                    user=user, name=name, prefix=prefix, secret_hash=_hash(secret), scopes=scopes
                )
        except IntegrityError:
            continue  # the random prefix was already taken
        return token, f"{TOKEN_MARK}_{prefix}_{secret}"


def authenticate(bearer):
    """Return the live token for `Authorization: Bearer <bearer>`, or None."""
    parts = bearer.split("_", 2)
    if len(parts) != 3 or parts[0] != TOKEN_MARK:
        return None
    _, prefix, secret = parts
    token = PersonalToken.objects.select_related("user").filter(prefix=prefix).first()
    expected = token.secret_hash if token is not None else _DECOY_HASH
    matches = hmac.compare_digest(_hash(secret), expected)
    if token is None or not matches or token.revoked_at is not None:
        return None
    return token


def revoke(token):
    if token.revoked_at is None:
        token.revoked_at = timezone.now()
        token.save(update_fields=["revoked_at"])


def revoke_all(user):
    PersonalToken.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=timezone.now())


def wait_after_counting(token):
    """Count a request of the token; return how long it must wait when it is over the limit, else 0."""
    now = timezone.now()
    recent = TokenRequest.objects.filter(token=token, requested_at__gt=now - WINDOW)
    requested = list(recent.order_by("-requested_at").values_list("requested_at", flat=True)[:REQUESTS_PER_MINUTE])
    if len(requested) == REQUESTS_PER_MINUTE:
        # The limit lifts when the oldest request of the window leaves it.
        return max(1, math.ceil((requested[-1] + WINDOW - now).total_seconds()))
    TokenRequest.objects.filter(token=token, requested_at__lte=now - WINDOW).delete()
    TokenRequest.objects.create(token=token, requested_at=now)
    return 0
