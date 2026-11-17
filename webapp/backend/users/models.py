from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower


def normalize_email(email):
    """Emails identify Users regardless of case (docs/contratos.md)."""
    return email.strip().lower()


class UserManager(BaseUserManager):
    def create_user(self, email, password):
        user = self.model(email=normalize_email(email))
        user.set_password(password)
        user.save(using=self._db)
        return user

    def get_by_natural_key(self, email):
        return self.get(email=normalize_email(email))


class User(AbstractBaseUser):
    email = models.EmailField(unique=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"

    class Meta:
        db_table = "users"
        # Emails are stored lowercase; the constraint holds even if one is not.
        constraints = [
            models.UniqueConstraint(Lower("email"), name="users_email_case_insensitive"),
        ]


class AccessAttempt(models.Model):
    """One counted attempt at a limited action, per email and per origin (docs/contratos.md)."""

    class Action(models.TextChoices):
        LOGIN = "login"
        PASSWORD_RECOVERY = "password_recovery"
        INVALID_TOKEN = "invalid_token"

    class Scope(models.TextChoices):
        EMAIL = "email"
        ORIGIN = "origin"

    action = models.CharField(max_length=17, choices=Action)
    scope = models.CharField(max_length=6, choices=Scope)
    key = models.CharField(max_length=254)
    attempted_at = models.DateTimeField()

    class Meta:
        db_table = "access_attempts"
        indexes = [
            models.Index(
                fields=["action", "scope", "key", "attempted_at"], name="access_attempts_recent"
            )
        ]


class PersonalToken(models.Model):
    """A revocable credential for scripts, limited to the permissions chosen at creation.

    Only the hash of the secret is stored. The prefix is public: it tells the
    User which token is which and finds the row to compare against.
    """

    class Scope(models.TextChoices):
        FINANCE_READ = "finance:read"
        MOVEMENTS_CREATE = "movements:create"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="personal_tokens")
    name = models.CharField(max_length=60)
    prefix = models.CharField(max_length=8, unique=True)
    secret_hash = models.CharField(max_length=64)
    scopes = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "personal_access_tokens"
        ordering = ["-created_at", "-id"]


class TokenRequest(models.Model):
    """One request a token made to `/api/v1`, counted for its per-minute limit."""

    token = models.ForeignKey(PersonalToken, on_delete=models.CASCADE, related_name="requests")
    requested_at = models.DateTimeField()

    class Meta:
        db_table = "token_requests"
        indexes = [models.Index(fields=["token", "requested_at"], name="token_requests_recent")]
