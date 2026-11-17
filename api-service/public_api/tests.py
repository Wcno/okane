import json
import threading
from unittest import mock

from django.db import connection
from django.test import TransactionTestCase, override_settings, tag

from erasure.models import ErasedUser
from expenses.models import Expense
from expenses.tests import FOOD, TODAY, ExpenseApiTestCase
from investments.models import Asset, InvestmentTransaction
from public_api.models import IdempotencyRecord

MOVEMENTS = "/api/v1/movements"


class PublicApiTestCase(ExpenseApiTestCase):
    def send(self, body, key="key-1", user=1, method="POST"):
        headers = {"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": str(user)}
        if key is not None:
            headers["Idempotency-Key"] = key
        return self.client.generic(
            method, MOVEMENTS, data=json.dumps(body), content_type="application/json", headers=headers
        )

    def expense_body(self, account, **fields):
        return {"type": "expense", "account_id": account["id"], "category_id": FOOD, "amount": "12.50", **fields}


class MovementTypeTests(PublicApiTestCase):
    def test_each_of_the_six_types_is_created_with_its_type_and_id(self):
        spending = self.account(name="Corriente")
        savings = self.account(name="Ahorro", type="savings")
        broker = self.account(name="Bróker", type="investment")
        asset = Asset.objects.create(provider="fake", market="XNAS", symbol="AAPL", name="Apple", currency="USD")
        bodies = {
            "income": {"account_id": spending["id"], "amount": "100.00"},
            "expense": {"account_id": spending["id"], "category_id": FOOD, "amount": "12.50"},
            "transfer": {
                "source_account_id": spending["id"],
                "destination_account_id": savings["id"],
                "amount": "20.00",
            },
            "buy": {"account_id": broker["id"], "asset_id": asset.id, "units": "2", "unit_price": "10"},
            "sell": {"account_id": broker["id"], "asset_id": asset.id, "units": "1", "unit_price": "11"},
            "dividend": {"account_id": broker["id"], "asset_id": asset.id, "amount": "0.50"},
        }
        # A transfer into an investment Account would fund the purchase; fund it first.
        self.assertEqual(
            self.send({"type": "transfer", "source_account_id": spending["id"],
                       "destination_account_id": broker["id"], "amount": "500.00"}, key="fund").status_code,
            201,
        )
        for kind, body in bodies.items():
            with self.subTest(kind=kind):
                response = self.send({"type": kind, **body, "date": "2026-11-16"}, key=f"create-{kind}")

                self.assertEqual(response.status_code, 201, response.content)
                self.assertEqual(response.json()["type"], kind)
                self.assertIsInstance(response.json()["id"], int)
        feed = self.call("GET", MOVEMENTS).json()
        self.assertEqual({row["type"] for row in feed["results"]}, set(bodies))

    def test_an_unknown_type_or_a_body_that_is_not_an_object_is_a_validation_error(self):
        for body in ({"type": "gift"}, {}, [1], "text"):
            with self.subTest(body=body):
                response = self.send(body)

                self.assertEqual(response.status_code, 400)
        self.assertEqual(IdempotencyRecord.objects.count(), 0)


class IdempotencyTests(PublicApiTestCase):
    def test_the_first_creation_is_201_and_an_identical_retry_is_200_with_the_same_record(self):
        account = self.account()
        body = self.expense_body(account)

        first = self.send(body)
        retry = self.send(body)

        self.assertEqual((first.status_code, retry.status_code), (201, 200))
        self.assertEqual(first.json(), retry.json())
        self.assertEqual(Expense.objects.count(), 1)

    def test_the_same_content_in_another_key_order_is_the_same_content(self):
        account = self.account()
        body = self.expense_body(account)

        self.send(body)
        retry = self.send(dict(reversed(list(body.items()))))

        self.assertEqual(retry.status_code, 200)

    def test_another_content_with_the_same_key_is_a_conflict_and_changes_nothing(self):
        account = self.account()
        self.send(self.expense_body(account))

        response = self.send(self.expense_body(account, amount="99.00"))

        self.assertEqual(response.status_code, 409)
        self.assertIn("idempotency_key", response.json()["errors"])
        self.assertEqual(Expense.objects.get().amount, 12.50)

    def test_a_missing_or_malformed_key_is_400_and_creates_nothing(self):
        account = self.account()
        for key in (None, "", "with space", "x" * 256, "ñandú"):
            with self.subTest(key=key):
                response = self.send(self.expense_body(account), key=key)

                self.assertEqual(response.status_code, 400)
                self.assertIn("idempotency_key", response.json()["errors"])
        self.assertEqual(Expense.objects.count(), 0)

    def test_a_refused_content_does_not_consume_the_key(self):
        account = self.account()

        refused = self.send(self.expense_body(account, amount="0"))
        accepted = self.send(self.expense_body(account))

        self.assertEqual((refused.status_code, accepted.status_code), (400, 201))

    def test_the_key_belongs_to_the_user_and_not_to_the_other_users(self):
        mine = self.account(user=1)
        theirs = self.account(user=2)

        first = self.send(self.expense_body(mine), user=1)
        other = self.send(self.expense_body(theirs), user=2)

        self.assertEqual((first.status_code, other.status_code), (201, 201))
        self.assertNotEqual(first.json()["id"], other.json()["id"])

    def test_the_retry_survives_deleting_the_record(self):
        account = self.account()
        body = self.expense_body(account)
        created = self.send(body).json()
        self.assertEqual(self.call("DELETE", f"/api/expenses/{created['id']}").status_code, 204)

        retry = self.send(body)

        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.json(), created)
        self.assertEqual(Expense.objects.count(), 0)

    def test_a_reference_of_another_user_is_404_and_does_not_consume_the_key(self):
        theirs = self.account(user=2)
        mine = self.account(user=1)

        refused = self.send(self.expense_body(theirs))
        accepted = self.send(self.expense_body(mine))

        self.assertEqual((refused.status_code, accepted.status_code), (404, 201))
        self.assertEqual(Expense.objects.filter(user_id=2).count(), 0)

    def test_an_expense_does_not_confirm_a_reservation(self):
        account = self.account()
        self.send(self.expense_body(account))

        self.assertEqual(InvestmentTransaction.objects.count(), 0)
        listed = self.call("GET", "/api/recurring-payments").json()
        self.assertEqual(listed["results"], [])


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ConcurrentIdempotencyTests(TransactionTestCase):
    def test_concurrent_identical_requests_create_one_record(self):
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)
        headers = {"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"}
        account = self.client.generic(
            "POST",
            "/api/accounts",
            data=json.dumps({"name": "Corriente", "type": "spending", "opening_balance": "100.00",
                             "opening_date": "2026-11-01"}),
            content_type="application/json",
            headers=headers,
        ).json()
        body = json.dumps({"type": "expense", "account_id": account["id"], "category_id": FOOD, "amount": "5.00"})
        statuses = []
        barrier = threading.Barrier(4)

        def attempt():
            try:
                barrier.wait()
                response = self.client_class().generic(
                    "POST",
                    MOVEMENTS,
                    data=body,
                    content_type="application/json",
                    headers={**headers, "Idempotency-Key": "same"},
                )
                statuses.append(response.status_code)
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(4)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(sorted(statuses), [200, 200, 200, 201])
        self.assertEqual(Expense.objects.count(), 1)


class ReadTests(PublicApiTestCase):
    def test_the_reads_of_v1_answer_what_the_application_does(self):
        account = self.account()
        self.send(self.expense_body(account))

        for path in ("/api/v1/accounts", "/api/v1/budgets", "/api/v1/movements"):
            with self.subTest(path=path):
                response = self.call("GET", path)

                self.assertEqual(response.status_code, 200, response.content)
        self.assertIn("balance", self.call("GET", "/api/v1/accounts").json()["results"][0])

    def test_v1_reads_have_no_writes_for_accounts_and_budgets(self):
        for path in ("/api/v1/accounts", "/api/v1/budgets"):
            with self.subTest(path=path):
                self.assertEqual(self.call("POST", path, {}).status_code, 405)


class ErasureTests(PublicApiTestCase):
    def test_erasing_the_user_erases_the_idempotency_keys(self):
        account = self.account()
        self.send(self.expense_body(account))

        self.assertEqual(self.call("DELETE", "/internal/users/me").status_code, 204)

        self.assertEqual(IdempotencyRecord.objects.filter(user_id=1).count(), 0)
        self.assertTrue(ErasedUser.objects.filter(user_id=1).exists())
        self.assertEqual(self.send(self.expense_body(account)).status_code, 409)
