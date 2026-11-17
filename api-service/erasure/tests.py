import json
import time
from concurrent.futures import ThreadPoolExecutor

from django.apps import apps
from django.db import connection, connections, transaction
from django.test import SimpleTestCase, TransactionTestCase, override_settings, tag

from accounts.models import Account
from erasure.locks import lock_for_erasure, lock_for_write
from erasure.models import ErasedUser
from erasure.service import ERASED_MODELS, erase_user_data
from expenses.models import Expense
from expenses.tests import FOOD, ExpenseApiTestCase

ERASE = "/internal/users/me"


class InternalErasureAccessTests(SimpleTestCase):
    @override_settings(INTERNAL_SERVICE_KEY="expected-key")
    def test_rejects_a_call_without_the_service_credential(self):
        for headers in ({}, {"X-Okane-Service-Key": "guessed-key", "X-Okane-User-Id": "1"}):
            with self.subTest(headers=headers):
                response = self.client.delete(ERASE, headers=headers)

                self.assertEqual(response.status_code, 403)

    @override_settings(INTERNAL_SERVICE_KEY="expected-key")
    def test_rejects_a_call_without_a_user_identity(self):
        response = self.client.delete(ERASE, headers={"X-Okane-Service-Key": "expected-key"})

        self.assertEqual(response.status_code, 403)


class ErasureApiTestCase(ExpenseApiTestCase):
    def expense(self, account, user=1):
        response = self.call(
            "POST",
            "/api/expenses",
            {"account_id": account["id"], "category_id": FOOD, "amount": "12.50"},
            user=user,
        )
        self.assertEqual(response.status_code, 201, response.content)

    def holdings(self, user):
        return (
            Account.objects.filter(user_id=user).count(),
            Expense.objects.filter(user_id=user).count(),
        )


class EraseUserDataTests(ErasureApiTestCase):
    def test_erases_the_accounts_and_expenses_of_the_user(self):
        account = self.account()
        self.expense(account)

        response = self.call("DELETE", ERASE)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.holdings(1), (0, 0))

    def test_keeps_the_data_of_other_users(self):
        mine, theirs = self.account(user=1), self.account(user=2)
        self.expense(mine, user=1)
        self.expense(theirs, user=2)

        self.call("DELETE", ERASE, user=1)

        self.assertEqual(self.holdings(2), (1, 1))
        listed = self.call("GET", "/api/expenses", user=2).json()
        self.assertEqual(listed["total"], 1)

    def test_repeating_the_call_succeeds_and_creates_nothing(self):
        self.account()

        first = self.call("DELETE", ERASE)
        second = self.call("DELETE", ERASE)

        self.assertEqual((first.status_code, second.status_code), (204, 204))
        self.assertEqual(self.holdings(1), (0, 0))
        self.assertEqual(ErasedUser.objects.filter(user_id=1).count(), 1)

    def test_erasing_a_user_without_data_succeeds(self):
        response = self.call("DELETE", ERASE, user=9)

        self.assertEqual(response.status_code, 204)

    def test_only_delete_is_accepted(self):
        for method in ("GET", "POST", "PUT"):
            with self.subTest(method=method):
                self.assertEqual(self.call(method, ERASE).status_code, 405)


class WritesAfterErasureTests(ErasureApiTestCase):
    def test_an_erased_user_cannot_create_data_from_an_older_session(self):
        account = self.account()
        self.call("DELETE", ERASE)

        created_account = self.call(
            "POST",
            "/api/accounts",
            {"name": "Otra", "type": "spending", "opening_balance": "1.00", "opening_date": "2026-11-01"},
        )
        created_expense = self.call(
            "POST",
            "/api/expenses",
            {"account_id": account["id"], "category_id": FOOD, "amount": "5.00"},
        )

        self.assertEqual((created_account.status_code, created_expense.status_code), (409, 409))
        self.assertEqual(self.holdings(1), (0, 0))

    def test_every_kind_of_write_is_refused(self):
        self.call("DELETE", ERASE)

        for method, path in (
            ("PUT", "/api/accounts/1"),
            ("DELETE", "/api/accounts/1"),
            ("PUT", "/api/expenses/1"),
            ("DELETE", "/api/expenses/1"),
        ):
            with self.subTest(method=method, path=path):
                self.assertEqual(self.call(method, path).status_code, 409)

    def test_reading_after_erasure_shows_nothing(self):
        self.account()
        self.call("DELETE", ERASE)

        listed = self.call("GET", "/api/accounts").json()

        self.assertEqual(listed["results"], [])

    def test_other_users_keep_writing(self):
        self.call("DELETE", ERASE, user=1)

        self.account(user=2)

        self.assertEqual(self.holdings(2)[0], 1)


class ErasureCoverageTests(SimpleTestCase):
    def test_every_model_with_a_user_is_erased(self):
        per_user = {
            model
            for model in apps.get_models()
            if any(field.name == "user_id" for field in model._meta.get_fields())
            and model is not ErasedUser
        }

        self.assertEqual(per_user, set(ERASED_MODELS))


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ConcurrentErasureTests(TransactionTestCase):
    def call(self, method, path, data=None):
        return self.client.generic(
            method,
            path,
            data="" if data is None else json.dumps(data),
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"},
        )

    def wait_until_a_session_waits_for_a_lock(self):
        deadline = time.monotonic() + 10
        with connection.cursor() as cursor:
            while time.monotonic() < deadline:
                cursor.execute("SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND NOT granted")
                if cursor.fetchone()[0]:
                    return
                time.sleep(0.02)
        self.fail("no write waited for the erasure lock")

    def test_a_write_that_starts_during_erasure_is_refused_once_it_finishes(self):
        def write():
            try:
                return self.call(
                    "POST",
                    "/api/accounts",
                    {"name": "Tarde", "type": "spending", "opening_balance": "1.00", "opening_date": "2026-11-01"},
                ).status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                lock_for_erasure(1)
                pending = pool.submit(write)
                self.wait_until_a_session_waits_for_a_lock()
                erase_user_data(1)
            status = pending.result(timeout=10)

        self.assertEqual(status, 409)
        self.assertEqual(Account.objects.filter(user_id=1).count(), 0)

    def test_erasure_waits_for_a_write_in_flight_and_removes_what_it_created(self):
        def erase():
            try:
                erase_user_data(1)
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                self.assertTrue(lock_for_write(1))
                Account.objects.create(
                    user_id=1,
                    name="En curso",
                    type="spending",
                    opening_balance="1.00",
                    opening_date="2026-11-01",
                )
                pending = pool.submit(erase)
                self.wait_until_a_session_waits_for_a_lock()
            pending.result(timeout=10)

        self.assertEqual(Account.objects.filter(user_id=1).count(), 0)
