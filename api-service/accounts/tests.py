import datetime
import json
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings, tag

from accounts import ledger

TODAY = datetime.date(2026, 11, 16)


class RecordedEntries:
    """Stands in for a later module (Income, Expense, Transfer) as a ledger source."""

    def __init__(self):
        self.entries = []

    def record(self, account_id, amount):
        self.entries.append((account_id, Decimal(amount)))

    def balance_changes(self, account_ids):
        changes = {}
        for account_id, amount in self.entries:
            if account_id in account_ids:
                changes[account_id] = changes.get(account_id, Decimal(0)) + amount
        return changes

    def accounts_with_records(self, account_ids):
        return {account_id for account_id, _ in self.entries if account_id in account_ids}


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class AccountApiTestCase(TestCase):
    """Calls api-service the way webapp does: service key plus the User's id."""

    def setUp(self):
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)
        self.entries = RecordedEntries()
        ledger.register(self.entries)
        self.addCleanup(ledger.unregister, self.entries)

    def call(self, method, path, data=None, user=1):
        return self.client.generic(
            method,
            path,
            data="" if data is None else data,
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": str(user)},
        )

    def create(self, user=1, **fields):
        body = {
            "name": "Cuenta corriente",
            "type": "spending",
            "opening_balance": "1000.00",
            "opening_date": "2026-11-01",
            **fields,
        }
        return self.call("POST", "/api/accounts", json.dumps(body), user=user)

    def created(self, user=1, **fields):
        response = self.create(user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def assert_rejected(self, response, field):
        self.assertEqual(response.status_code, 400, response.content)
        errors = response.json()["errors"]
        self.assertEqual(list(errors), [field])
        self.assertTrue(errors[field][0])

    def accounts(self, user=1, query=""):
        response = self.call("GET", "/api/accounts" + query, user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]


class CreateAccountTests(AccountApiTestCase):
    def test_a_new_account_is_listed_with_its_opening_balance_as_balance(self):
        response = self.create()

        self.assertEqual(response.status_code, 201, response.content)
        created = response.json()
        self.assertEqual(
            created,
            {
                "id": created["id"],
                "name": "Cuenta corriente",
                "type": "spending",
                "opening_balance": "1000.00",
                "opening_date": "2026-11-01",
                "annual_interest_rate": None,
                "balance": "1000.00",
                "has_records": False,
                "archived_at": None,
            },
        )
        self.assertEqual(self.accounts(), [created])

    def test_a_savings_account_accepts_an_annual_interest_rate(self):
        created = self.created(type="savings", annual_interest_rate="0.0425")

        self.assertEqual(created["annual_interest_rate"], "0.042500")
        self.assertEqual(self.created(type="savings", annual_interest_rate="0")["annual_interest_rate"], "0.000000")
        self.assertIsNone(self.created(type="savings")["annual_interest_rate"])

    def test_a_credit_card_is_a_spending_account_with_a_negative_opening_balance(self):
        created = self.created(name="Tarjeta de crédito", opening_balance="-312.45")

        self.assertEqual(created["opening_balance"], "-312.45")
        self.assertEqual(created["balance"], "-312.45")

    def test_the_opening_date_may_be_today_or_in_the_past(self):
        self.assertEqual(self.create(opening_date="2026-11-16").status_code, 201)
        self.assertEqual(self.create(opening_date="2019-02-28").status_code, 201)

    def test_rejects_an_opening_date_in_the_future(self):
        self.assert_rejected(self.create(opening_date="2026-11-17"), "opening_date")

    def test_requires_name_type_opening_balance_and_opening_date(self):
        response = self.call("POST", "/api/accounts", "{}")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            sorted(response.json()["errors"]),
            ["name", "opening_balance", "opening_date", "type"],
        )

    def test_rejects_a_blank_or_overlong_name(self):
        self.assert_rejected(self.create(name="   "), "name")
        self.assert_rejected(self.create(name="x" * 81), "name")

    def test_rejects_an_unknown_type(self):
        self.assert_rejected(self.create(type="credit"), "type")

    def test_rejects_an_opening_balance_that_is_not_an_exact_amount_in_cents(self):
        for amount in ("10.005", "abc", "", "1e3", "NaN", "Infinity", 10.5, 10, None):
            with self.subTest(amount=amount):
                self.assert_rejected(self.create(opening_balance=amount), "opening_balance")

    def test_rejects_an_interest_rate_on_an_account_that_is_not_for_savings(self):
        for account_type in ("spending", "investment"):
            with self.subTest(type=account_type):
                self.assert_rejected(
                    self.create(type=account_type, annual_interest_rate="0.05"),
                    "annual_interest_rate",
                )

    def test_rejects_a_negative_or_inexact_interest_rate(self):
        for rate in ("-0.01", "0.1234567", "abc", 0.05):
            with self.subTest(rate=rate):
                self.assert_rejected(
                    self.create(type="savings", annual_interest_rate=rate), "annual_interest_rate"
                )

    def test_rejects_a_body_that_is_not_json(self):
        self.assert_rejected(self.call("POST", "/api/accounts", "{not json"), "form")
        self.assert_rejected(self.call("POST", "/api/accounts", "[]"), "form")

    def test_the_owner_comes_from_webapp_and_never_from_the_body(self):
        self.created(user=1, user_id=2)

        self.assertEqual(len(self.accounts(user=1)), 1)
        self.assertEqual(self.accounts(user=2), [])


class BalanceTests(AccountApiTestCase):
    def test_the_balance_adds_what_was_recorded_to_the_opening_balance(self):
        account = self.created(opening_balance="0.10")
        self.entries.record(account["id"], "0.20")
        self.entries.record(account["id"], "-0.05")

        [listed] = self.accounts()

        # Binary floating point would answer 0.25000000000000006.
        self.assertEqual(listed["balance"], "0.25")
        self.assertEqual(listed["opening_balance"], "0.10")
        self.assertTrue(listed["has_records"])

    def test_records_of_one_account_do_not_change_another(self):
        first = self.created(opening_balance="100.00")
        second = self.created(opening_balance="50.00")
        self.entries.record(first["id"], "-130.00")

        balances = {account["id"]: account["balance"] for account in self.accounts()}

        self.assertEqual(balances, {first["id"]: "-30.00", second["id"]: "50.00"})


class EditAccountTests(AccountApiTestCase):
    def put(self, account_id, body, user=1):
        return self.call("PUT", f"/api/accounts/{account_id}", json.dumps(body), user=user)

    def test_corrects_the_name(self):
        account = self.created()

        response = self.put(account["id"], {"name": "  Cuenta de nómina "})

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {**account, "name": "Cuenta de nómina"})
        self.assertEqual(self.accounts(), [response.json()])

    def test_corrects_the_annual_interest_rate_of_a_savings_account(self):
        account = self.created(type="savings", annual_interest_rate="0.04")

        changed = self.put(account["id"], {"name": "Ahorro", "annual_interest_rate": "0.0375"})
        self.assertEqual(changed.json()["annual_interest_rate"], "0.037500")

        kept = self.put(account["id"], {"name": "Ahorro"})
        self.assertEqual(kept.json()["annual_interest_rate"], "0.037500")

        cleared = self.put(account["id"], {"name": "Ahorro", "annual_interest_rate": None})
        self.assertIsNone(cleared.json()["annual_interest_rate"])

    def test_never_changes_the_balance_the_opening_balance_its_date_or_the_type(self):
        account = self.created()
        attempts = {
            "balance": "5000.00",
            "opening_balance": "5000.00",
            "opening_date": "2026-10-01",
            "type": "savings",
        }

        for field, value in attempts.items():
            with self.subTest(field=field):
                self.assert_rejected(self.put(account["id"], {"name": "Otra", field: value}), field)

        self.assertEqual(self.accounts(), [account])

    def test_rejects_an_interest_rate_on_an_account_that_is_not_for_savings(self):
        account = self.created(type="investment")

        response = self.put(account["id"], {"name": "Bróker", "annual_interest_rate": "0.05"})

        self.assert_rejected(response, "annual_interest_rate")
        self.assertEqual(self.accounts(), [account])

    def test_requires_a_name(self):
        account = self.created()

        self.assert_rejected(self.put(account["id"], {}), "name")
        self.assert_rejected(self.put(account["id"], {"name": ""}), "name")


class DeleteAccountTests(AccountApiTestCase):
    def delete(self, account_id, user=1):
        return self.call("DELETE", f"/api/accounts/{account_id}", user=user)

    def test_removes_an_account_without_records(self):
        mistake = self.created(name="Creada por error")
        kept = self.created(name="Cuenta corriente")

        response = self.delete(mistake["id"])

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.accounts(), [kept])

    def test_archives_an_account_with_records_and_keeps_its_balance(self):
        account = self.created(name="Ahorro", type="savings", opening_balance="400.00")
        other = self.created(opening_balance="1000.00")
        self.entries.record(account["id"], "100.00")

        response = self.delete(account["id"])

        self.assertEqual(response.status_code, 200, response.content)
        archived = response.json()
        self.assertEqual(archived["balance"], "500.00")
        self.assertTrue(archived["has_records"])
        self.assertIsNotNone(archived["archived_at"])
        # Archiving is not an outflow: both Accounts still add up to $1,500.
        self.assertEqual(self.accounts(), [archived, other])

    def test_archiving_again_changes_nothing(self):
        account = self.created()
        self.entries.record(account["id"], "-20.00")
        archived = self.delete(account["id"]).json()

        again = self.delete(account["id"])

        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json(), archived)

    def test_an_archived_account_can_still_be_renamed(self):
        account = self.created()
        self.entries.record(account["id"], "-20.00")
        archived = self.delete(account["id"]).json()

        response = self.call(
            "PUT", f"/api/accounts/{account['id']}", json.dumps({"name": "Cuenta vieja"})
        )

        self.assertEqual(response.json(), {**archived, "name": "Cuenta vieja"})


class IsolationTests(AccountApiTestCase):
    def test_a_user_sees_only_their_own_accounts(self):
        mine = self.created(user=1, name="Mía")
        self.created(user=2, name="Ajena")

        self.assertEqual(self.accounts(user=1), [mine])

    def test_editing_the_account_of_another_user_answers_not_found(self):
        theirs = self.created(user=2, name="Ajena")

        response = self.call(
            "PUT", f"/api/accounts/{theirs['id']}", json.dumps({"name": "Tomada"}), user=1
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "not_found"})
        self.assertEqual(self.accounts(user=2), [theirs])

    def test_deleting_the_account_of_another_user_answers_not_found(self):
        theirs = self.created(user=2, name="Ajena")
        with_records = self.created(user=2, name="Con movimientos")
        self.entries.record(with_records["id"], "10.00")
        before = self.accounts(user=2)

        for account in (theirs, with_records):
            response = self.call("DELETE", f"/api/accounts/{account['id']}", user=1)
            self.assertEqual(response.status_code, 404)

        self.assertEqual(self.accounts(user=2), before)
        self.assertEqual([account["archived_at"] for account in before], [None, None])

    def test_an_account_that_does_not_exist_answers_not_found(self):
        self.assertEqual(self.call("DELETE", "/api/accounts/999999").status_code, 404)
        self.assertEqual(self.call("PUT", "/api/accounts/999999", '{"name": "x"}').status_code, 404)


class AccountListTests(AccountApiTestCase):
    def page(self, query=""):
        return self.call("GET", "/api/accounts" + query)

    def test_returns_fifty_accounts_and_the_total_by_default(self):
        for number in range(51):
            self.created(name=f"Cuenta {number}")

        body = self.page().json()

        self.assertEqual(len(body["results"]), 50)
        self.assertEqual(
            {key: body[key] for key in ("total", "page", "page_size", "next_page")},
            {"total": 51, "page": 1, "page_size": 50, "next_page": 2},
        )

        last = self.page("?page=2").json()
        self.assertEqual([account["name"] for account in last["results"]], ["Cuenta 50"])
        self.assertIsNone(last["next_page"])

    def test_accepts_a_page_size_of_up_to_two_hundred(self):
        for number in range(3):
            self.created(name=f"Cuenta {number}")

        body = self.page("?page_size=2&page=2").json()

        self.assertEqual([account["name"] for account in body["results"]], ["Cuenta 2"])
        self.assertEqual(self.page("?page_size=200").status_code, 200)

    def test_rejects_a_page_size_or_a_page_out_of_range(self):
        self.created()

        for query, field in (
            ("?page_size=500", "page_size"),
            ("?page_size=201", "page_size"),
            ("?page_size=0", "page_size"),
            ("?page_size=abc", "page_size"),
            ("?page=0", "page"),
            ("?page=2", "page"),
            ("?page=-1", "page"),
        ):
            with self.subTest(query=query):
                self.assert_rejected(self.page(query), field)

    def test_an_empty_list_is_the_first_page(self):
        body = self.page().json()

        self.assertEqual(
            body, {"results": [], "total": 0, "page": 1, "page_size": 50, "next_page": None}
        )
