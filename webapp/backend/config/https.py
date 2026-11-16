"""Settings that follow from serving webapp over HTTPS.

HTTPS reaches webapp only through a reverse proxy that terminates TLS, sets
`X-Forwarded-Proto` and drops any value the client sent. With HTTPS on,
Django trusts that header, so CSRF compares origins as `https://host`, and
the session and CSRF cookies travel only over HTTPS.
"""


def https_settings(serves_https):
    return {
        "SECURE_PROXY_SSL_HEADER": ("HTTP_X_FORWARDED_PROTO", "https") if serves_https else None,
        "SESSION_COOKIE_SECURE": serves_https,
        "CSRF_COOKIE_SECURE": serves_https,
    }
