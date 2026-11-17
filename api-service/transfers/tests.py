import datetime
import json
from decimal import Decimal
from unittest import mock

from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings, tag

from accounts.models import Account
from transfers.models import Transfer

TODAY = datetime.date(2026, 11, 16)


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class TransferApiTestCase(TestCase):
    """Calls api-service the way webapp does: service key plus the User's id."""

    def setUp(self):
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)

    def call(self, method, path, data=None, user=1):
        return self.client.generic(
            method,
            path,
            data="" if data is None else json.dumps(data),
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": str(user)},
        )

    def account(self, user=1, **fields):
        body = {
            "name": "Cuenta corriente",
            "type": "spending",
            "opening_balance": "1000.00",
            "opening_date": "2026-11-01",
            **fields,
        }
        response = self.call("POST", "/api/accounts", body, user=user)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def archive(self, account, user=1):
        response = self.call("DELETE", f"/api/accounts/{account['id']}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNotNone(response.json()["archived_at"])

    def listed(self, account, user=1):
        accounts = self.call("GET", "/api/accounts", user=user).json()["results"]
        return next(item for item in accounts if item["id"] == account["id"])

    def balance(self, account, user=1):
        return self.listed(account, user)["balance"]

    def balances(self, *accounts, user=1):
        return tuple(self.balance(account, user) for account in accounts)

    def net_contribution(self, account, user=1):
        return self.listed(account, user)["net_contribution"]

    def body(self, source, destination, **fields):
        return {
            "amount": "250.00",
            "source_account_id": source["id"],
            "destination_account_id": destination["id"],
            **fields,
        }

    def transfer(self, source, destination, user=1, **fields):
        return self.call("POST", "/api/transfers", self.body(source, destination, **fields), user=user)

    def transferred(self, source, destination, user=1, **fields):
        response = self.transfer(source, destination, user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def put(self, transfer, user=1, **fields):
        body = {
            "amount": transfer["amount"],
            "source_account_id": transfer["source_account_id"],
            "destination_account_id": transfer["destination_account_id"],
            "date": transfer["date"],
            "description": transfer["description"],
            **fields,
        }
        return self.call("PUT", f"/api/transfers/{transfer['id']}", body, user=user)

    def assert_rejected(self, response, field):
        self.assertEqual(response.status_code, 400, response.content)
        errors = response.json()["errors"]
        self.assertEqual(list(errors), [field])
        self.assertTrue(errors[field][0])

    def total_of_balances(self, *accounts):
        return sum(Decimal(balance) for balance in self.balances(*accounts))


class RegisterTransferTests(TransferApiTestCase):
    def test_a_transfer_lowers_the_source_and_raises_the_destination_by_the_same_amount(self):
        source = self.account(name="Corriente", opening_balance="1000.00")
        destination = self.account(name="Ahorro", type="savings", opening_balance="300.00")

        response = self.transfer(source, destination, amount="250.00", description=" Quincena ")

        self.assertEqual(response.status_code, 201, response.content)
        created = response.json()
        self.assertEqual(
            created,
            {
                "id": created["id"],
                "amount": "250.00",
                "source_account_id": source["id"],
                "destination_account_id": destination["id"],
                "date": "2026-11-16",
                "description": "Quincena",
            },
        )
        self.assertEqual(self.balances(source, destination), ("750.00", "550.00"))

    def test_a_transfer_leaves_the_total_of_the_balances_unchanged(self):
        source = self.account(opening_balance="1000.00")
        destination = self.account(opening_balance="300.00")
        before = self.total_of_balances(source, destination)

        self.transferred(source, destination, amount="123.45")
        self.transferred(destination, source, amount="0.01")

        self.assertEqual(self.total_of_balances(source, destination), before)

    def test_a_transfer_carries_no_category_and_leaves_expenses_untouched(self):
        source = self.account()
        destination = self.account(name="Otra")

        created = self.transferred(source, destination)

        self.assertNotIn("category_id", created)
        self.assertEqual(self.call("GET", "/api/expenses").json()["total"], 0)

    def test_the_date_starts_as_today_and_the_description_is_optional(self):
        created = self.transferred(self.account(), self.account(name="Otra"))

        self.assertEqual((created["date"], created["description"]), ("2026-11-16", ""))

    def test_a_balance_that_turns_negative_is_accepted(self):
        source = self.account(opening_balance="10.00")
        destination = self.account(name="Otra", opening_balance="0.00")

        self.transferred(source, destination, amount="25.00")

        self.assertEqual(self.balances(source, destination), ("-15.00", "25.00"))

    def test_the_balances_keep_exact_cents(self):
        source = self.account(opening_balance="0.30")
        destination = self.account(name="Otra", opening_balance="0.00")

        for _ in range(3):
            self.transferred(source, destination, amount="0.10")

        self.assertEqual(self.balances(source, destination), ("0.00", "0.30"))

    def test_accounts_with_transfers_are_marked_and_archived_instead_of_deleted(self):
        source = self.account()
        destination = self.account(name="Otra")
        self.transferred(source, destination, amount="100.00")

        self.assertTrue(self.listed(source)["has_records"])
        self.assertTrue(self.listed(destination)["has_records"])
        self.archive(destination)
        self.assertEqual(self.balance(destination), "1100.00")


class TransferValidationTests(TransferApiTestCase):
    def test_requires_an_amount_a_source_and_a_destination(self):
        response = self.call("POST", "/api/transfers", {})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            sorted(response.json()["errors"]),
            ["amount", "destination_account_id", "source_account_id"],
        )

    def test_rejects_an_amount_that_is_not_positive_or_not_exact_cents(self):
        source, destination = self.account(), self.account(name="Otra")

        for amount in ("0", "0.00", "-5.00", "10.005", "abc", "", "1e3", "NaN", 12.5, 12, None):
            with self.subTest(amount=amount):
                self.assert_rejected(self.transfer(source, destination, amount=amount), "amount")

        self.assertEqual(self.balances(source, destination), ("1000.00", "1000.00"))

    def test_rejects_a_transfer_from_an_account_to_itself(self):
        account = self.account()

        response = self.transfer(account, account)

        self.assert_rejected(response, "destination_account_id")
        self.assertEqual(self.balance(account), "1000.00")
        self.assertEqual(Transfer.objects.count(), 0)

    def test_rejects_a_date_in_the_future(self):
        source, destination = self.account(), self.account(name="Otra")

        self.assert_rejected(self.transfer(source, destination, date="2026-11-17"), "date")
        self.assertEqual(self.balances(source, destination), ("1000.00", "1000.00"))

    def test_accepts_today_and_a_past_date(self):
        source = self.account(opening_date="2020-01-01")
        destination = self.account(name="Otra", opening_date="2020-01-01")

        self.assertEqual(self.transferred(source, destination, date="2026-11-16")["date"], "2026-11-16")
        self.assertEqual(self.transferred(source, destination, date="2020-01-01")["date"], "2020-01-01")

    def test_rejects_a_date_before_either_account_started(self):
        early = self.account(name="Temprana", opening_date="2026-11-01")
        late = self.account(name="Tardía", opening_date="2026-11-10")

        self.assert_rejected(self.transfer(early, late, date="2026-11-09"), "date")
        self.assert_rejected(self.transfer(late, early, date="2026-11-09"), "date")
        self.assertEqual(self.transferred(early, late, date="2026-11-10")["date"], "2026-11-10")

    def test_rejects_an_unreadable_date(self):
        source, destination = self.account(), self.account(name="Otra")

        for date in ("16/11/2026", "2026-02-30", "", "2026-11-16T10:00:00", 20261116, None):
            with self.subTest(date=date):
                self.assert_rejected(self.transfer(source, destination, date=date), "date")

    def test_rejects_a_description_over_140_characters(self):
        source, destination = self.account(), self.account(name="Otra")

        self.assert_rejected(self.transfer(source, destination, description="x" * 141), "description")
        created = self.transferred(source, destination, description="x" * 140)
        self.assertEqual(len(created["description"]), 140)

    def test_rejects_an_archived_account_on_either_side(self):
        live = self.account(name="Viva")
        archived = self.account(name="Vieja")
        self.transferred(archived, live, amount="100.00")
        self.archive(archived)

        self.assert_rejected(self.transfer(archived, live), "source_account_id")
        self.assert_rejected(self.transfer(live, archived), "destination_account_id")
        self.assertEqual(self.balances(archived, live), ("900.00", "1100.00"))
        self.assertEqual(Transfer.objects.count(), 1)

    def test_rejects_account_ids_that_are_not_integers(self):
        source, destination = self.account(), self.account(name="Otra")

        for value in ("abc", 1.5, True, None):
            with self.subTest(value=value):
                self.assert_rejected(
                    self.transfer(source, destination, source_account_id=value), "source_account_id"
                )

    def test_rejects_a_body_that_is_not_json(self):
        response = self.client.generic(
            "POST",
            "/api/transfers",
            data="{not json",
            content_type="application/json",
            headers={"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"},
        )

        self.assert_rejected(response, "form")


class TransferAtomicityTests(TransferApiTestCase):
    """A failure after validation leaves both Balances as they were."""

    def setUp(self):
        super().setUp()
        self.client.raise_request_exception = False
        self.source = self.account(name="Origen", opening_balance="1000.00")
        self.destination = self.account(name="Destino", opening_balance="300.00")

    def assert_balances_kept(self, expected=("1000.00", "300.00")):
        self.assertEqual(self.balances(self.source, self.destination), expected)

    def test_a_failure_while_registering_keeps_both_balances_and_stores_nothing(self):
        with mock.patch("transfers.models.Transfer.objects.create", side_effect=IntegrityError):
            response = self.transfer(self.source, self.destination)

        self.assertEqual(response.status_code, 500)
        self.assert_balances_kept()
        self.assertEqual(Transfer.objects.count(), 0)

    def test_a_failure_while_editing_keeps_the_stored_transfer_and_both_balances(self):
        created = self.transferred(self.source, self.destination, amount="100.00")
        other = self.account(name="Otra", opening_balance="50.00")

        with mock.patch("transfers.models.Transfer.save", side_effect=IntegrityError):
            response = self.put(created, destination_account_id=other["id"], amount="400.00")

        self.assertEqual(response.status_code, 500)
        self.assert_balances_kept(("900.00", "400.00"))
        self.assertEqual(self.balance(other), "50.00")
        self.assertEqual(self.call("GET", f"/api/transfers/{created['id']}").json(), created)

    def test_a_failure_while_deleting_keeps_the_transfer_and_both_balances(self):
        created = self.transferred(self.source, self.destination, amount="100.00")

        with mock.patch("transfers.models.Transfer.delete", side_effect=IntegrityError):
            response = self.call("DELETE", f"/api/transfers/{created['id']}")

        self.assertEqual(response.status_code, 500)
        self.assert_balances_kept(("900.00", "400.00"))
        self.assertEqual(Transfer.objects.count(), 1)

    def test_a_rejected_edit_keeps_both_balances(self):
        created = self.transferred(self.source, self.destination, amount="100.00")

        self.assert_rejected(self.put(created, amount="0"), "amount")
        self.assert_rejected(self.put(created, date="2026-11-17"), "date")

        self.assert_balances_kept(("900.00", "400.00"))


class TransferIsolationTests(TransferApiTestCase):
    def test_an_account_of_another_user_answers_not_found_and_changes_no_balance(self):
        mine = self.account(user=1)
        theirs = self.account(user=2)

        for response in (self.transfer(mine, theirs), self.transfer(theirs, mine)):
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json(), {"detail": "not_found"})

        self.assertEqual(self.balance(mine), "1000.00")
        self.assertEqual(self.balance(theirs, user=2), "1000.00")
        self.assertEqual(Transfer.objects.count(), 0)

    def test_an_account_that_does_not_exist_answers_not_found(self):
        account = self.account()

        response = self.transfer(account, account, destination_account_id=999999)

        self.assertEqual(response.status_code, 404)

    def test_not_found_wins_over_the_validation_of_the_other_fields(self):
        mine, theirs = self.account(user=1), self.account(user=2)

        responses = [
            self.transfer(mine, theirs, amount="0"),
            self.transfer(theirs, mine, date="2026-11-17"),
            self.call("POST", "/api/transfers", {"source_account_id": theirs["id"]}),
            self.transfer(mine, mine, destination_account_id=theirs["id"], description="x" * 141),
        ]

        self.assertEqual([response.status_code for response in responses], [404] * 4)

    def test_rejects_an_amount_past_twelve_whole_digits_with_its_own_message(self):
        source, destination = self.account(), self.account(name="Otra")

        response = self.transfer(source, destination, amount="1000000000000.00")

        self.assert_rejected(response, "amount")
        self.assertIn("demasiado grande", response.json()["errors"]["amount"][0])

    def test_the_owner_comes_from_webapp_and_never_from_the_body(self):
        source, destination = self.account(user=1), self.account(user=1, name="Otra")

        self.transferred(source, destination, user=1, user_id=2)

        self.assertEqual(self.call("GET", "/api/transfers", user=1).json()["total"], 1)
        self.assertEqual(self.call("GET", "/api/transfers", user=2).json()["total"], 0)


class ListTransfersTests(TransferApiTestCase):
    def page(self, query="", user=1):
        return self.call("GET", "/api/transfers" + query, user=user)

    def test_lists_the_newest_date_first_and_the_latest_registered_first_within_a_day(self):
        source = self.account(opening_date="2026-01-01")
        destination = self.account(name="Otra", opening_date="2026-01-01")
        old = self.transferred(source, destination, date="2026-11-01")
        first_today = self.transferred(source, destination, date="2026-11-16")
        later_today = self.transferred(source, destination, date="2026-11-16")
        backdated = self.transferred(source, destination, date="2026-11-10")

        body = self.page().json()

        self.assertEqual(
            [transfer["id"] for transfer in body["results"]],
            [later_today["id"], first_today["id"], backdated["id"], old["id"]],
        )

    def test_returns_fifty_transfers_and_the_total_by_default(self):
        source, destination = self.account(), self.account(name="Otra")
        for _ in range(51):
            self.transferred(source, destination, amount="1.00")

        body = self.page().json()

        self.assertEqual(len(body["results"]), 50)
        self.assertEqual(
            {key: body[key] for key in ("total", "page", "page_size", "next_page")},
            {"total": 51, "page": 1, "page_size": 50, "next_page": 2},
        )
        last = self.page("?page=2").json()
        self.assertEqual(len(last["results"]), 1)
        self.assertIsNone(last["next_page"])

    def test_rejects_a_page_size_or_a_page_out_of_range(self):
        self.transferred(self.account(), self.account(name="Otra"))

        for query, field in (("?page_size=500", "page_size"), ("?page_size=0", "page_size"), ("?page=2", "page")):
            with self.subTest(query=query):
                self.assert_rejected(self.page(query), field)

    def test_an_empty_list_is_the_first_page(self):
        self.assertEqual(
            self.page().json(),
            {"results": [], "total": 0, "page": 1, "page_size": 50, "next_page": None},
        )

    def test_a_user_sees_only_their_own_transfers(self):
        mine = self.transferred(self.account(user=1), self.account(user=1, name="Otra"), user=1)
        self.transferred(self.account(user=2), self.account(user=2, name="Otra"), user=2)

        listed = self.page(user=1).json()

        self.assertEqual([transfer["id"] for transfer in listed["results"]], [mine["id"]])
        self.assertEqual(listed["total"], 1)


class ReadTransferTests(TransferApiTestCase):
    def test_returns_one_transfer(self):
        created = self.transferred(self.account(), self.account(name="Otra"), description="Ahorro")

        response = self.call("GET", f"/api/transfers/{created['id']}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), created)

    def test_a_transfer_of_another_user_or_unknown_answers_not_found(self):
        theirs = self.transferred(self.account(user=2), self.account(user=2, name="Otra"), user=2)

        for transfer_id in (theirs["id"], 999999):
            with self.subTest(transfer_id=transfer_id):
                response = self.call("GET", f"/api/transfers/{transfer_id}", user=1)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json(), {"detail": "not_found"})


class EditTransferTests(TransferApiTestCase):
    def setUp(self):
        super().setUp()
        self.source = self.account(name="Origen", opening_balance="1000.00")
        self.destination = self.account(name="Destino", opening_balance="300.00")
        self.created = self.transferred(self.source, self.destination, amount="100.00")

    def test_correcting_the_amount_moves_both_balances_by_the_difference(self):
        self.assertEqual(self.balances(self.source, self.destination), ("900.00", "400.00"))

        response = self.put(self.created, amount="40.25")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {**self.created, "amount": "40.25"})
        self.assertEqual(self.balances(self.source, self.destination), ("959.75", "340.25"))

    def test_correcting_the_date_and_the_description(self):
        response = self.put(self.created, date="2026-11-02", description="Corregida")

        self.assertEqual(
            response.json(), {**self.created, "date": "2026-11-02", "description": "Corregida"}
        )

    def test_changing_the_source_reverts_the_old_one_and_charges_the_new_one(self):
        other = self.account(name="Otra", opening_balance="500.00")

        response = self.put(self.created, source_account_id=other["id"])

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.balances(self.source, self.destination, other), ("1000.00", "400.00", "400.00"))

    def test_changing_the_destination_reverts_the_old_one_and_credits_the_new_one(self):
        other = self.account(name="Otra", opening_balance="500.00")

        response = self.put(self.created, destination_account_id=other["id"])

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.balances(self.source, self.destination, other), ("900.00", "300.00", "600.00"))

    def test_swapping_source_and_destination_reverses_the_direction(self):
        response = self.put(
            self.created,
            source_account_id=self.destination["id"],
            destination_account_id=self.source["id"],
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.balances(self.source, self.destination), ("1100.00", "200.00"))

    def test_an_edit_keeps_the_total_of_the_balances(self):
        other = self.account(name="Otra", opening_balance="500.00")
        before = self.total_of_balances(self.source, self.destination, other)

        self.put(self.created, destination_account_id=other["id"], amount="333.33")

        self.assertEqual(self.total_of_balances(self.source, self.destination, other), before)

    def test_rejects_making_it_a_transfer_to_the_same_account(self):
        response = self.put(self.created, destination_account_id=self.source["id"])

        self.assert_rejected(response, "destination_account_id")
        self.assertEqual(self.balances(self.source, self.destination), ("900.00", "400.00"))

    def test_rejects_moving_a_side_into_an_archived_account(self):
        archived = self.account(name="Vieja")
        self.transferred(archived, self.destination, amount="1.00")
        self.archive(archived)

        self.assert_rejected(self.put(self.created, source_account_id=archived["id"]), "source_account_id")
        self.assert_rejected(
            self.put(self.created, destination_account_id=archived["id"]), "destination_account_id"
        )
        self.assertEqual(self.balances(self.source, self.destination), ("900.00", "401.00"))

    def test_a_transfer_touching_an_account_archived_since_can_still_be_corrected(self):
        self.transferred(self.destination, self.source, amount="1.00")
        self.archive(self.destination)

        response = self.put(self.created, amount="60.00", description="Corregida")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.balances(self.source, self.destination), ("941.00", "359.00"))

    def test_applies_the_date_rules_of_a_new_transfer(self):
        late = self.account(name="Tardía", opening_date="2026-11-14")

        self.assert_rejected(self.put(self.created, date="2026-11-17"), "date")
        self.assert_rejected(self.put(self.created, date="2026-10-31"), "date")
        # The date must also follow the Account the Transfer moves to.
        self.assert_rejected(self.put(self.created, date="2026-11-12", destination_account_id=late["id"]), "date")
        self.assertEqual(self.put(self.created, date="2026-11-01").status_code, 200)

    def test_requires_the_same_fields_as_registering(self):
        response = self.call("PUT", f"/api/transfers/{self.created['id']}", {})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            sorted(response.json()["errors"]),
            ["amount", "destination_account_id", "source_account_id"],
        )

    def test_requires_the_date_instead_of_assuming_today(self):
        body = {
            key: self.created[key]
            for key in ("amount", "source_account_id", "destination_account_id")
        }

        response = self.call("PUT", f"/api/transfers/{self.created['id']}", body)

        self.assert_rejected(response, "date")

    def test_the_transfer_of_another_user_answers_not_found_and_stays_unchanged(self):
        theirs_source = self.account(user=2)
        theirs_destination = self.account(user=2, name="Otra")
        theirs = self.transferred(theirs_source, theirs_destination, user=2, amount="100.00")

        response = self.put(theirs, user=1, amount="1.00")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balances(theirs_source, theirs_destination, user=2), ("900.00", "1100.00"))

    def test_moving_a_side_to_an_account_of_another_user_answers_not_found_and_changes_no_balance(self):
        theirs = self.account(user=2)

        for field in ("source_account_id", "destination_account_id"):
            with self.subTest(field=field):
                response = self.put(self.created, **{field: theirs["id"]})

                self.assertEqual(response.status_code, 404)
                self.assertEqual(self.balances(self.source, self.destination), ("900.00", "400.00"))
                self.assertEqual(self.balance(theirs, user=2), "1000.00")
                self.assertEqual(
                    self.call("GET", f"/api/transfers/{self.created['id']}").json(), self.created
                )


class DeleteTransferTests(TransferApiTestCase):
    def delete(self, transfer, user=1):
        return self.call("DELETE", f"/api/transfers/{transfer['id']}", user=user)

    def test_deleting_a_transfer_restores_both_balances(self):
        source = self.account(opening_balance="1000.00")
        destination = self.account(name="Otra", opening_balance="300.00")
        kept = self.transferred(source, destination, amount="10.00")
        removed = self.transferred(source, destination, amount="100.00")
        self.assertEqual(self.balances(source, destination), ("890.00", "410.00"))

        response = self.delete(removed)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.balances(source, destination), ("990.00", "310.00"))
        listed = self.call("GET", "/api/transfers").json()
        self.assertEqual([transfer["id"] for transfer in listed["results"]], [kept["id"]])
        self.assertEqual(self.call("GET", f"/api/transfers/{removed['id']}").status_code, 404)

    def test_an_account_without_transfers_left_can_be_deleted_again(self):
        source, destination = self.account(), self.account(name="Otra")
        transfer = self.transferred(source, destination)
        self.delete(transfer)

        self.assertEqual(self.call("DELETE", f"/api/accounts/{source['id']}").status_code, 204)
        self.assertEqual(self.call("DELETE", f"/api/accounts/{destination['id']}").status_code, 204)

    def test_a_transfer_touching_an_archived_account_can_be_deleted(self):
        source, destination = self.account(), self.account(name="Otra")
        transfer = self.transferred(source, destination, amount="100.00")
        self.archive(destination)

        self.assertEqual(self.delete(transfer).status_code, 204)
        self.assertEqual(self.balances(source, destination), ("1000.00", "1000.00"))

    def test_the_transfer_of_another_user_answers_not_found_and_stays(self):
        source, destination = self.account(user=2), self.account(user=2, name="Otra")
        theirs = self.transferred(source, destination, user=2, amount="100.00")

        response = self.delete(theirs, user=1)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.balances(source, destination, user=2), ("900.00", "1100.00"))
        self.assertEqual(self.call("GET", "/api/transfers", user=2).json()["total"], 1)

    def test_deleting_twice_answers_not_found_the_second_time(self):
        transfer = self.transferred(self.account(), self.account(name="Otra"))
        self.delete(transfer)

        self.assertEqual(self.delete(transfer).status_code, 404)


class NetContributionTests(TransferApiTestCase):
    def broker(self, **fields):
        return self.account(name="Bróker", type="investment", opening_balance="1000.00", **fields)

    def test_starts_as_the_opening_balance_of_the_investment_account(self):
        self.assertEqual(self.net_contribution(self.broker()), "1000.00")

    def test_other_account_types_have_no_net_contribution(self):
        for kind in ("spending", "savings"):
            with self.subTest(kind=kind):
                self.assertIsNone(self.net_contribution(self.account(type=kind)))

    def test_transfers_in_add_and_transfers_out_subtract(self):
        broker = self.broker()
        cash = self.account(name="Corriente", opening_balance="5000.00")

        self.transferred(cash, broker, amount="300.00")
        self.transferred(cash, broker, amount="200.00")
        self.transferred(broker, cash, amount="150.00")

        self.assertEqual(self.net_contribution(broker), "1350.00")
        self.assertEqual(self.balance(broker), "1350.00")

    def test_a_transfer_between_other_accounts_does_not_change_it(self):
        broker = self.broker()
        first, second = self.account(name="Primera"), self.account(name="Segunda")

        self.transferred(first, second, amount="100.00")

        self.assertEqual(self.net_contribution(broker), "1000.00")

    def test_a_transfer_between_two_investment_accounts_keeps_the_total_contribution(self):
        first = self.broker()
        second = self.account(name="Otro bróker", type="investment", opening_balance="400.00")
        total = lambda: Decimal(self.net_contribution(first)) + Decimal(self.net_contribution(second))
        before = total()

        self.transferred(first, second, amount="250.00")

        self.assertEqual((self.net_contribution(first), self.net_contribution(second)), ("750.00", "650.00"))
        self.assertEqual(total(), before)

    def test_editing_and_deleting_revert_the_contribution(self):
        broker = self.broker()
        cash = self.account(name="Corriente", opening_balance="5000.00")
        created = self.transferred(cash, broker, amount="300.00")

        self.put(created, amount="500.00")
        self.assertEqual(self.net_contribution(broker), "1500.00")
        self.put(created, source_account_id=cash["id"], destination_account_id=self.account(name="Otra")["id"])
        self.assertEqual(self.net_contribution(broker), "1000.00")
        self.put(created, destination_account_id=broker["id"])
        self.call("DELETE", f"/api/transfers/{created['id']}")
        self.assertEqual(self.net_contribution(broker), "1000.00")

    def test_stays_after_the_account_is_archived(self):
        broker = self.broker()
        cash = self.account(name="Corriente")
        self.transferred(cash, broker, amount="200.00")

        self.archive(broker)

        self.assertEqual(self.net_contribution(broker), "1200.00")

    def test_is_per_user(self):
        mine = self.broker()
        theirs = self.account(user=2, type="investment", opening_balance="10.00")
        self.transferred(self.account(user=2, name="Corriente"), theirs, user=2, amount="5.00")

        self.assertEqual(self.net_contribution(mine), "1000.00")
        self.assertEqual(self.net_contribution(theirs, user=2), "15.00")


class DatabaseRulesTests(TransferApiTestCase):
    def test_the_database_refuses_a_transfer_to_the_same_account_and_a_zero_amount(self):
        account = self.account()

        row = Account.objects.get(pk=account["id"])
        other = Account.objects.get(pk=self.account(name="Otra")["id"])

        for source, destination, amount in ((row, row, "1.00"), (row, other, "0.00")):
            with self.subTest(amount=amount), self.assertRaises(IntegrityError):
                with transaction.atomic():
                    Transfer.objects.create(
                        user_id=1,
                        source_account=source,
                        destination_account=destination,
                        amount=amount,
                        date=TODAY,
                    )
