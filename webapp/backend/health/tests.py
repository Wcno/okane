from unittest import mock

from django.db import OperationalError
from django.test import SimpleTestCase, TestCase, tag


@tag("database")
class HealthWithDatabaseTests(TestCase):
    def test_reports_webapp_and_its_database_as_ready(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"status": "ok", "service": "webapp", "database": "ok"}
        )


class HealthWithoutDatabaseTests(SimpleTestCase):
    def test_names_the_database_when_it_cannot_be_reached(self):
        with mock.patch("health.views.connection") as connection:
            connection.cursor.side_effect = OperationalError("connection refused")
            response = self.client.get("/health")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json(),
            {"status": "unavailable", "service": "webapp", "database": "unavailable"},
        )
