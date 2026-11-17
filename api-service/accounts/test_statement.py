import datetime
import json
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings, tag

from investments.models import Asset

TODAY = datetime.date(2026, 11, 16)
FOOD = 1


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class AccountStatementTests(TestCase):
    """Reads the Statement through the API after recording every kind of movement."""

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

    def post(self, path, body, user=1):
        response = self.call("POST", path, body, user=user)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def account(self, account_type="spending", user=1, **fields):
        return self.post(
            "/api/accounts",
            {
                "name": "Cuenta",
                "type": account_type,
                "opening_balance": "1000.00",
                "opening_date": "2026-11-01",
                **fields,
            },
            user=user,
        )

    def statement(self, account, user=1, query=""):
        response = self.call("GET", f"/api/accounts/{account['id']}/statement{query}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def balance(self, account):
        accounts = self.call("GET", "/api/accounts").json()["results"]
        return next(item["balance"] for item in accounts if item["id"] == account["id"])

    def test_a_spending_account_lists_every_movement_with_its_running_balance(self):
        checking = self.account()
        savings = self.account("savings", name="Ahorro", opening_balance="0.00")
        self.post("/api/incomes", {"account_id": checking["id"], "amount": "500.00", "date": "2026-11-02"})
        self.post(
            "/api/expenses",
            {"account_id": checking["id"], "category_id": FOOD, "amount": "120.10", "date": "2026-11-03"},
        )
        self.post(
            "/api/transfers",
            {
                "source_account_id": checking["id"],
                "destination_account_id": savings["id"],
                "amount": "300.00",
                "date": "2026-11-04",
            },
        )
        self.post(
            "/api/transfers",
            {
                "source_account_id": savings["id"],
                "destination_account_id": checking["id"],
                "amount": "50.25",
                "date": "2026-11-05",
            },
        )

        lines = self.statement(checking)["results"]

        self.assertEqual(
            [(line["kind"], line["date"], line["amount"], line["balance"]) for line in lines],
            [
                ("opening", "2026-11-01", "1000.00", "1000.00"),
                ("income", "2026-11-02", "500.00", "1500.00"),
                ("expense", "2026-11-03", "-120.10", "1379.90"),
                ("transfer_out", "2026-11-04", "-300.00", "1079.90"),
                ("transfer_in", "2026-11-05", "50.25", "1130.15"),
            ],
        )
        self.assertEqual(lines[-1]["balance"], self.balance(checking))
        self.assertEqual(lines[3]["counterpart_account_id"], savings["id"])
        self.assertEqual(lines[2]["category_id"], FOOD)

    def test_an_investment_account_lists_buys_sells_and_transfers_ending_at_its_balance(self):
        broker = self.account("investment", name="Bróker", opening_balance="2000.00")
        checking = self.account()
        asset = Asset.objects.create(
            provider="fake", market="XNAS", symbol="AAPL", name="Apple", currency="USD"
        )
        self.post(
            "/api/transfers",
            {
                "source_account_id": checking["id"],
                "destination_account_id": broker["id"],
                "amount": "100.00",
                "date": "2026-11-02",
            },
        )
        for kind, units, price, date in [
            ("buy", "3", "10.333", "2026-11-03"),
            ("sell", "1.5", "12.5", "2026-11-06"),
        ]:
            self.post(
                f"/api/investments/transactions/{kind}",
                {
                    "account_id": broker["id"],
                    "asset_id": asset.id,
                    "units": units,
                    "unit_price": price,
                    "date": date,
                },
            )

        lines = self.statement(broker)["results"]

        self.assertEqual(
            [(line["kind"], line["amount"], line["balance"]) for line in lines],
            [
                ("opening", "2000.00", "2000.00"),
                ("transfer_in", "100.00", "2100.00"),
                ("buy", "-31.00", "2069.00"),
                ("sell", "18.75", "2087.75"),
            ],
        )
        self.assertEqual(lines[2]["asset"], {"symbol": "AAPL", "name": "Apple"})
        self.assertEqual(lines[-1]["balance"], self.balance(broker))

    def test_movements_of_one_date_keep_their_registration_order(self):
        account = self.account()
        for amount in ["10.00", "20.00", "30.00"]:
            self.post("/api/incomes", {"account_id": account["id"], "amount": amount, "date": "2026-11-02"})
        self.post(
            "/api/expenses",
            {"account_id": account["id"], "category_id": FOOD, "amount": "5.00", "date": "2026-11-02"},
        )

        lines = self.statement(account)["results"]

        self.assertEqual(
            [line["amount"] for line in lines[1:]], ["10.00", "20.00", "30.00", "-5.00"]
        )

    def test_a_movement_registered_later_for_an_earlier_date_takes_its_place_in_the_past(self):
        account = self.account()
        self.post("/api/incomes", {"account_id": account["id"], "amount": "10.00", "date": "2026-11-10"})
        self.post("/api/incomes", {"account_id": account["id"], "amount": "99.00", "date": "2026-11-03"})

        lines = self.statement(account)["results"]

        self.assertEqual([line["balance"] for line in lines], ["1000.00", "1099.00", "1109.00"])

    def test_the_balances_do_not_depend_on_the_page_or_the_order_asked_for(self):
        account = self.account()
        for day in range(2, 8):
            self.post(
                "/api/incomes",
                {"account_id": account["id"], "amount": "0.10", "date": f"2026-11-0{day}"},
            )

        whole = self.statement(account)["results"]
        second = self.statement(account, query="?page=2&page_size=3")
        newest_first = self.statement(account, query="?order=desc&page_size=3")

        self.assertEqual(second["results"], whole[3:6])
        self.assertEqual(second["total"], 7)
        self.assertEqual(newest_first["results"], list(reversed(whole))[:3])
        self.assertEqual(newest_first["results"][0]["balance"], self.balance(account))

    def test_exact_cents_survive_a_long_history(self):
        account = self.account(opening_balance="0.00")
        for _ in range(10):
            self.post("/api/incomes", {"account_id": account["id"], "amount": "0.10", "date": "2026-11-02"})

        lines = self.statement(account)["results"]

        self.assertEqual(lines[-1]["balance"], "1.00")
        self.assertEqual(Decimal(lines[-1]["balance"]), Decimal("1.00"))

    def test_an_account_without_movements_shows_only_its_opening_balance(self):
        account = self.account(opening_balance="-312.45")

        lines = self.statement(account)["results"]

        self.assertEqual([(line["kind"], line["balance"]) for line in lines], [("opening", "-312.45")])

    def test_another_users_account_is_not_found_and_their_movements_never_appear(self):
        mine = self.account()
        theirs = self.account(user=2)
        self.post("/api/incomes", {"account_id": theirs["id"], "amount": "77.00", "date": "2026-11-02"}, user=2)

        self.assertEqual(self.call("GET", f"/api/accounts/{theirs['id']}/statement").status_code, 404)
        self.assertEqual(len(self.statement(mine)["results"]), 1)

    def test_a_statement_that_is_not_an_order_is_rejected(self):
        account = self.account()

        response = self.call("GET", f"/api/accounts/{account['id']}/statement?order=sideways")

        self.assertEqual(response.status_code, 400)
        self.assertIn("order", response.json()["errors"])
