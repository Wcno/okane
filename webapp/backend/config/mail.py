"""Settings for the mail webapp sends and for the links inside it.

Without a mail server, messages are printed to the console, which is how
development works (docs/spec.md). Setting `EMAIL_HOST` switches to SMTP.
"""

from urllib.parse import urlsplit

from django.core.exceptions import ImproperlyConfigured


def mail_settings(host, port, user, password, use_tls, sender):
    if not host:
        return {
            "EMAIL_BACKEND": "django.core.mail.backends.console.EmailBackend",
            "DEFAULT_FROM_EMAIL": sender,
        }
    return {
        "EMAIL_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
        "EMAIL_HOST": host,
        "EMAIL_PORT": int(port),
        "EMAIL_HOST_USER": user,
        "EMAIL_HOST_PASSWORD": password,
        "EMAIL_USE_TLS": use_tls,
        "EMAIL_TIMEOUT": 10,
        "DEFAULT_FROM_EMAIL": sender,
    }


def public_origin(value):
    """Return the origin users open webapp on, such as `https://okane.example`.

    Mailed links are built on it, never on a request header, so a forged
    `Host` cannot point a reset link at another site (docs/contratos.md).
    """
    parts = urlsplit(value)
    is_origin = (
        parts.scheme in ("http", "https")
        and parts.hostname
        and parts.path in ("", "/")
        and not (parts.query or parts.fragment or parts.username)
    )
    if not is_origin:
        raise ImproperlyConfigured(
            "PUBLIC_ORIGIN must be an origin such as https://okane.example, "
            f"with no path; got {value!r}."
        )
    return f"{parts.scheme}://{parts.netloc}"
