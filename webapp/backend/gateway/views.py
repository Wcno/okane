import httpx
from django.conf import settings
from django.http import HttpResponse, JsonResponse

from gateway.upstream import api_service, service_headers

# The forwarded request is built from scratch: only these client headers are
# copied, so cookies, tokens and forged service identities never reach
# api-service (docs/contratos.md, "Identidad y aislamiento").
FORWARDED_REQUEST_HEADERS = ("Accept", "Content-Type")

# Readiness is the one call that needs no session; it carries no User.
PUBLIC_PATHS = frozenset({"/api/health"})


def authentication_required():
    return JsonResponse({"detail": "authentication_required"}, status=401)


def forward(request):
    """Send an `/api/*` call to api-service over the internal network."""
    # A dot segment would be resolved by the HTTP client and reach a path
    # outside /api with the service credential attached.
    if any(segment in (".", "..") for segment in request.path.split("/")):
        return JsonResponse({"detail": "not_found"}, status=404)

    user_id = None
    if request.path not in PUBLIC_PATHS:
        if not request.user.is_authenticated:
            return authentication_required()
        user_id = request.user.pk
    return relay(request, user_id)


def relay(request, user_id, extra_headers=()):
    """Rebuild the call from scratch for api-service, on behalf of `user_id` when there is one."""
    headers = {
        name: request.headers[name]
        for name in (*FORWARDED_REQUEST_HEADERS, *extra_headers)
        if name in request.headers
    }
    headers = service_headers(headers, user_id)

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
