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


class LoginFailure(models.Model):
    """One failed login, counted per email and per origin (docs/contratos.md)."""

    class Scope(models.TextChoices):
        EMAIL = "email"
        ORIGIN = "origin"

    scope = models.CharField(max_length=6, choices=Scope)
    key = models.CharField(max_length=254)
    failed_at = models.DateTimeField()

    class Meta:
        db_table = "login_failures"
        indexes = [models.Index(fields=["scope", "key", "failed_at"])]
