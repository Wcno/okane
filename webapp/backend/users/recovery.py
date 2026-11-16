"""Password reset links (docs/contratos.md, "Acceso, sesiones y límites de uso").

A link carries a signed token, so nothing is stored. The signature covers the
User's password hash and last login: the token stops working as soon as the
password changes, which makes it single use, and `PASSWORD_RESET_TIMEOUT`
seconds after it was issued.
"""

import logging
from datetime import UTC

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils import timezone

from users.models import User

logger = logging.getLogger(__name__)

SUBJECT = "Restablece tu contraseña de Okane"
MESSAGE = """Hola:

Recibimos una solicitud para restablecer la contraseña de tu usuario de Okane.
Abre este enlace para elegir una contraseña nueva:

{link}

El enlace sirve una sola vez y caduca en {lifetime}.

Si no lo pediste, ignora este correo: tu contraseña sigue siendo la misma.
"""


class ResetTokenGenerator(PasswordResetTokenGenerator):
    def _now(self):
        # Django reads the system clock here; use the replaceable one instead.
        return timezone.now().astimezone(UTC).replace(tzinfo=None)


token_generator = ResetTokenGenerator()


def _lifetime():
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60
    if minutes == 60:
        return "1 hora"
    return "1 minuto" if minutes == 1 else f"{minutes} minutos"


def send_reset_link(user):
    """Mail the User a link to choose a new password; never raises."""
    token = f"{user.pk}-{token_generator.make_token(user)}"
    link = f"{settings.PUBLIC_ORIGIN}/reset-password/{token}"
    try:
        send_mail(
            SUBJECT,
            MESSAGE.format(link=link, lifetime=_lifetime()),
            from_email=None,
            recipient_list=[user.email],
        )
    except Exception:
        # The caller answers the same whether or not a message went out.
        logger.exception("Could not send a password reset message.")


def user_for_token(token):
    """Return the User a reset token was issued to, or None if it no longer works."""
    user_id, _, signature = token.partition("-")
    # isascii: isdecimal alone accepts digits of other scripts. The length
    # keeps the number inside the range of the key column.
    if not (user_id.isascii() and user_id.isdecimal() and len(user_id) <= 18):
        return None
    user = User.objects.filter(pk=int(user_id)).first()
    if user is None or not token_generator.check_token(user, signature):
        return None
    return user
