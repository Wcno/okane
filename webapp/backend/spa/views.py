import re
from pathlib import Path

from django.conf import settings
from django.http import Http404, HttpResponse
from django.views.decorators.http import require_safe

# WhiteNoise answers every file that exists. A request that still names a
# static file is a missing asset, not a route the frontend can render. The
# list is explicit because a route may contain dots, such as a reset token.
STATIC_FILE = re.compile(
    r"\.(?:js|mjs|css|map|json|txt|webmanifest|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf)$"
)


@require_safe
def application(request):
    """Answer a client-side route with the built frontend entry page."""
    if STATIC_FILE.search(request.path):
        raise Http404("No such file.")
    index = Path(settings.WHITENOISE_ROOT) / "index.html"
    try:
        html = index.read_bytes()
    except FileNotFoundError:
        raise Http404("The frontend has not been built.") from None
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    # The entry page names hashed assets, so browsers must always revalidate it.
    response["Cache-Control"] = "no-cache"
    return response
