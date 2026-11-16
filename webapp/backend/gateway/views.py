import httpx
from django.conf import settings
from django.http import HttpResponse, JsonResponse

SERVICE_KEY_HEADER = "X-Okane-Service-Key"
USER_ID_HEADER = "X-Okane-User-Id"

# The forwarded request is built from scratch: only these client headers are
# copied, so cookies, tokens and forged service identities never reach
# api-service (docs/contratos.md, "Identidad y aislamiento").
FORWARDED_REQUEST_HEADERS = ("Accept", "Content-Type")

# Readiness is the one call that needs no session; it carries no User.
PUBLIC_PATHS = frozenset({"/api/health"})
# The public API authenticates personal tokens (#32); a session cookie never
# substitutes for one.
TOKEN_API = "/api/v1"

api_service = httpx.Client(timeout=10)


def authentication_required():
    return JsonResponse({"detail": "authentication_required"}, status=401)


def forward(request):
    """Send an `/api/*` call to api-service over the internal network."""
    # A dot segment would be resolved by the HTTP client and reach a path
    # outside /api with the service credential attached.
    if any(segment in (".", "..") for segment in request.path.split("/")):
        return JsonResponse({"detail": "not_found"}, status=404)

    headers = {
        name: request.headers[name]
        for name in FORWARDED_REQUEST_HEADERS
        if name in request.headers
    }
    headers[SERVICE_KEY_HEADER] = settings.INTERNAL_SERVICE_KEY
    if request.path not in PUBLIC_PATHS:
        is_token_api = request.path == TOKEN_API or request.path.startswith(TOKEN_API + "/")
        if is_token_api or not request.user.is_authenticated:
            return authentication_required()
        headers[USER_ID_HEADER] = str(request.user.pk)

    # get_full_path keeps the query string exactly as the client sent it.
    url = settings.API_SERVICE_URL + request.get_full_path()
    try:
        upstream = api_service.request(
            request.method, url, headers=headers, content=request.body
        )
    except httpx.TransportError:
        return JsonResponse({"status": "unavailable", "service": "api-service"}, status=502)
    return HttpResponse(
        upstream.content,
        status=upstream.status_code,
        content_type=upstream.headers.get("Content-Type"),
    )
