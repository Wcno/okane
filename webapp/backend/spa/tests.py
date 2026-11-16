import shutil
import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings

INDEX_HTML = '<!doctype html><title>Okane</title><div id="root"></div>'


class FrontendTestCase(SimpleTestCase):
    """Serves a small built frontend from a temporary directory."""

    def setUp(self):
        dist = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, dist)
        (dist / "index.html").write_text(INDEX_HTML)
        (dist / "assets").mkdir()
        (dist / "assets" / "app.js").write_text("console.log('okane')")
        settings = override_settings(WHITENOISE_ROOT=dist)
        settings.enable()
        self.addCleanup(settings.disable)


class SinglePageRouteTests(FrontendTestCase):
    def test_opening_the_dashboard_directly_serves_the_entry_page(self):
        response = self.client.get("/dashboard")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), INDEX_HTML)
        self.assertEqual(response["Content-Type"], "text/html; charset=utf-8")

    def test_a_route_whose_last_segment_contains_a_dot_is_still_a_route(self):
        response = self.client.get("/reset-password/header.payload.signature")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode(), INDEX_HTML)

    def test_backend_routes_are_never_answered_with_the_entry_page(self):
        for path in ("/auth/login", "/auth/unknown", "/users/me", "/health/unknown"):
            with self.subTest(path=path):
                response = self.client.get(path)

                self.assertEqual(response.status_code, 404)
                self.assertNotIn(b'id="root"', response.content)


class StaticFileTests(FrontendTestCase):
    def test_serves_the_built_assets(self):
        response = self.client.get("/assets/app.js")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"console.log('okane')")
        self.assertIn("javascript", response["Content-Type"])

    def test_a_missing_file_is_not_answered_with_the_entry_page(self):
        response = self.client.get("/assets/missing.js")

        self.assertEqual(response.status_code, 404)
