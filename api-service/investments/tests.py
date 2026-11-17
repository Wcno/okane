import json
import threading
import time
from unittest import mock

from django.db import connection
from django.test import Client, TransactionTestCase, override_settings, tag

from expenses.tests import FOOD, TODAY, ExpenseApiTestCase
from investments import quotes
from investments.models import Asset, InvestmentTransaction
from investments.serializers import InvestmentTransactionSerializer


class FakeQuotes:
    def __init__(self, *candidates, failure=None):
        self.candidates = candidates
        self.failure = failure
        self.queries = []

    def search(self, query):
        self.queries.append(query)
        if self.failure:
            raise self.failure
        return list(self.candidates)


def candidate(symbol="AAPL", market="XNAS", name="Apple Inc", **fields):
    return quotes.AssetCandidate(
        provider="fake",
        market=market,
        symbol=symbol,
        name=name,
        asset_type=fields.get("asset_type", "Common Stock"),
        currency=fields.get("currency", "USD"),
    )


class InvestmentApiTestCase(ExpenseApiTestCase):
    def investment_account(self, user=1, **fields):
        fields.setdefault("name", "Bróker")
        return self.account(user=user, type="investment", **fields)

    def asset(self, symbol="AAPL", market="XNAS", name="Apple Inc"):
        return Asset.objects.create(
            provider="fake", market=market, symbol=symbol, name=name, currency="USD"
        )

    def trade(self, kind, account, asset, units, unit_price, user=1, **fields):
        body = {
            "account_id": account["id"],
            "asset_id": asset.id,
            "units": units,
            "unit_price": unit_price,
            **fields,
        }
        return self.call("POST", f"/api/investments/transactions/{kind}", body, user=user)

    def bought(self, account, asset, units, unit_price, user=1, **fields):
        response = self.trade("buy", account, asset, units, unit_price, user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def sold(self, account, asset, units, unit_price, user=1, **fields):
        response = self.trade("sell", account, asset, units, unit_price, user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def positions(self, user=1, query=""):
        response = self.call("GET", f"/api/investments/positions{query}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()


class AssetSearchTests(InvestmentApiTestCase):
    def search(self, query="aapl", service=None, user=1):
        with mock.patch("investments.quotes.provider", return_value=service):
            return self.call("GET", f"/api/investments/assets/search?q={query}", user=user)

    def test_what_the_provider_finds_joins_the_catalog_with_its_identity(self):
        service = FakeQuotes(candidate())

        response = self.search(service=service)

        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertTrue(body["provider_available"])
        found = body["results"][0]
        self.assertEqual(
            {key: found[key] for key in ("provider", "market", "symbol", "name", "currency")},
            {
                "provider": "fake",
                "market": "XNAS",
                "symbol": "AAPL",
                "name": "Apple Inc",
                "currency": "USD",
            },
        )
        self.assertEqual(service.queries, ["aapl"])

    def test_the_same_symbol_in_two_markets_is_two_assets(self):
        service = FakeQuotes(candidate("SHOP", "XTSE", "Shopify"), candidate("SHOP", "XNYS", "Shopify"))

        results = self.search("shop", service).json()["results"]

        self.assertEqual({item["market"] for item in results}, {"XTSE", "XNYS"})
        self.assertEqual(len({item["id"] for item in results}), 2)

    def test_searching_again_does_not_duplicate_the_catalog(self):
        service = FakeQuotes(candidate())

        first = self.search(service=service).json()["results"]
        second = self.search(service=service).json()["results"]

        self.assertEqual(first, second)
        self.assertEqual(Asset.objects.count(), 1)

    def test_a_failing_provider_leaves_the_known_assets_to_choose_from(self):
        self.asset("MSFT", name="Microsoft")
        service = FakeQuotes(failure=quotes.QuotesUnavailable())

        body = self.search("micro", service).json()

        self.assertFalse(body["provider_available"])
        self.assertEqual([item["symbol"] for item in body["results"]], ["MSFT"])

    def test_without_a_provider_key_only_the_catalog_answers(self):
        self.asset("MSFT", name="Microsoft")

        body = self.search("msft", service=None).json()

        self.assertFalse(body["provider_available"])
        self.assertEqual([item["symbol"] for item in body["results"]], ["MSFT"])

    def test_an_exact_symbol_comes_before_longer_matches(self):
        self.asset("AAPLX", name="Apple fund")
        self.asset("AAPL", name="Apple Inc")

        results = self.search("aapl", service=None).json()["results"]

        self.assertEqual([item["symbol"] for item in results], ["AAPL", "AAPLX"])

    def test_an_empty_query_is_rejected(self):
        self.assert_rejected(self.search("%20", service=None), "q")

    def test_a_search_without_session_headers_is_not_answered(self):
        response = self.client.get("/api/investments/assets/search?q=aapl")

        self.assertEqual(response.status_code, 403)


class BuyTests(InvestmentApiTestCase):
    def test_a_purchase_takes_its_cash_out_of_the_investment_account(self):
        account = self.investment_account(opening_balance="1000.00")
        asset = self.asset()

        created = self.bought(account, asset, "2", "100.00")

        self.assertEqual(
            created,
            {
                "id": created["id"],
                "type": "buy",
                "account_id": account["id"],
                "asset_id": asset.id,
                "units": "2.00000000",
                "unit_price": "100.00000000",
                "cash_amount": "200.00",
                "commission": "0.00",
                "date": "2026-11-16",
                "account_balance": "800.00",
            },
        )
        self.assertEqual(self.balance(account), "800.00")

    def test_units_and_prices_admit_eight_decimals(self):
        account = self.investment_account(opening_balance="1000.00")

        created = self.bought(account, self.asset(), "0.12345678", "1234.56789012")

        self.assertEqual(created["units"], "0.12345678")
        self.assertEqual(created["cash_amount"], "152.42")

    def test_a_ninth_decimal_is_rejected(self):
        account = self.investment_account()

        response = self.trade("buy", account, self.asset(), "1.123456789", "10")

        self.assert_rejected(response, "units")

    def test_cash_rounds_half_away_from_zero_once_not_per_operation(self):
        account = self.investment_account(opening_balance="0.00")
        asset = self.asset()

        self.assertEqual(self.bought(account, asset, "3", "0.835")["cash_amount"], "2.51")
        self.assertEqual(self.bought(account, asset, "3", "0.834")["cash_amount"], "2.50")
        self.assertEqual(self.balance(account), "-5.01")

    def test_an_amount_that_rounds_to_zero_cents_is_rejected(self):
        account = self.investment_account()

        response = self.trade("buy", account, self.asset(), "0.00000001", "1")

        self.assert_rejected(response, "units")
        self.assertEqual(self.balance(account), "1000.00")

    def test_numbers_that_are_not_decimal_strings_are_rejected(self):
        account = self.investment_account()
        asset = self.asset()

        for units in (2, 2.5, "1e3", "", None, "0", "-1"):
            with self.subTest(units=units):
                self.assert_rejected(self.trade("buy", account, asset, units, "10"), "units")
        self.assert_rejected(self.trade("buy", account, asset, "1", "0"), "unit_price")

    def test_a_purchase_without_enough_cash_is_accepted_and_leaves_negative_cash(self):
        account = self.investment_account(opening_balance="50.00")

        created = self.bought(account, self.asset(), "1", "80.00")

        self.assertEqual(created["account_balance"], "-30.00")
        self.assertEqual(self.balance(account), "-30.00")

    def test_a_purchase_can_be_dated_in_the_past(self):
        account = self.investment_account(opening_date="2026-10-01")

        created = self.bought(account, self.asset(), "1", "10", date="2026-10-15")

        self.assertEqual(created["date"], "2026-10-15")

    def test_a_future_date_is_rejected(self):
        account = self.investment_account()

        response = self.trade("buy", account, self.asset(), "1", "10", date="2026-11-17")

        self.assert_rejected(response, "date")

    def test_a_date_before_the_account_started_is_rejected(self):
        account = self.investment_account(opening_date="2026-11-01")

        response = self.trade("buy", account, self.asset(), "1", "10", date="2026-10-31")

        self.assert_rejected(response, "date")

    def test_only_an_investment_account_takes_purchases(self):
        asset = self.asset()
        for kind in ("spending", "savings"):
            with self.subTest(kind=kind):
                account = self.account(type=kind)
                self.assert_rejected(self.trade("buy", account, asset, "1", "10"), "account_id")

    def test_an_archived_account_takes_no_new_purchases(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "1", "10")
        self.archive(account)

        self.assert_rejected(self.trade("buy", account, asset, "1", "10"), "account_id")

    def test_an_investment_account_takes_no_expenses(self):
        account = self.investment_account()

        self.assert_rejected(self.register(account), "account_id")

    def test_another_users_account_and_unknown_references_are_not_found(self):
        mine = self.investment_account(user=1)
        theirs = self.investment_account(user=2)
        asset = self.asset()

        self.assertEqual(self.trade("buy", theirs, asset, "1", "10", user=1).status_code, 404)
        self.assertEqual(self.balance(theirs, user=2), "1000.00")
        missing = mock.Mock(id=0)
        self.assertEqual(self.trade("buy", mine, missing, "1", "10").status_code, 404)

    def test_an_account_with_purchases_is_archived_not_deleted(self):
        account = self.investment_account()
        self.bought(account, self.asset(), "1", "10")

        self.archive(account)

        self.assertEqual(self.balance(account), "990.00")

    def test_a_field_api_service_does_not_know_is_refused_not_ignored(self):
        account = self.investment_account()
        asset = self.asset()

        for kind in ("buy", "sell"):
            with self.subTest(kind=kind):
                response = self.trade(kind, account, asset, "1", "10", surcharge="1.00")
                self.assert_rejected(response, "surcharge")
        self.assertEqual(self.balance(account), "1000.00")

    def test_a_missing_field_names_the_field(self):
        account = self.investment_account()

        response = self.call("POST", "/api/investments/transactions/buy", {"account_id": account["id"]})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.json()["errors"]), {"asset_id", "units", "unit_price"})


class SellTests(InvestmentApiTestCase):
    def test_a_sale_returns_its_cash_to_the_account(self):
        account = self.investment_account(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100")

        sold = self.sold(account, asset, "1", "150")

        self.assertEqual(sold["type"], "sell")
        self.assertEqual(sold["cash_amount"], "150.00")
        self.assertEqual(sold["account_balance"], "950.00")

    def test_selling_more_units_than_the_position_holds_is_rejected(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "2", "100")

        response = self.trade("sell", account, asset, "2.00000001", "100")

        self.assert_rejected(response, "units")
        self.assertIn("2", response.json()["errors"]["units"][0])
        self.assertEqual(self.balance(account), "800.00")

    def test_selling_exactly_what_is_held_is_accepted(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "0.5", "100")

        self.sold(account, asset, "0.5", "120")

        self.assertEqual(self.positions()["results"], [])

    def test_units_held_in_another_account_do_not_count(self):
        first = self.investment_account(name="Una")
        second = self.investment_account(name="Otra")
        asset = self.asset()
        self.bought(first, asset, "5", "10")

        self.assert_rejected(self.trade("sell", second, asset, "1", "10"), "units")

    def test_units_of_another_asset_do_not_count(self):
        account = self.investment_account()
        self.bought(account, self.asset("AAPL"), "5", "10")

        self.assert_rejected(self.trade("sell", account, self.asset("MSFT"), "1", "10"), "units")

    def test_a_past_sale_cannot_come_before_the_units_were_bought(self):
        account = self.investment_account(opening_date="2026-10-01")
        asset = self.asset()
        self.bought(account, asset, "1", "10", date="2026-11-10")

        self.assert_rejected(self.trade("sell", account, asset, "1", "10", date="2026-11-05"), "units")

    def test_a_past_sale_cannot_leave_a_later_sale_without_units(self):
        account = self.investment_account(opening_date="2026-10-01")
        asset = self.asset()
        self.bought(account, asset, "3", "10", date="2026-10-05")
        self.sold(account, asset, "2", "12", date="2026-11-10")

        response = self.trade("sell", account, asset, "2", "11", date="2026-10-20")

        self.assert_rejected(response, "units")
        self.assertIn("hasta 1", response.json()["errors"]["units"][0])
        self.sold(account, asset, "1", "11", date="2026-10-20")

    def test_a_sale_on_the_day_of_the_purchase_comes_after_it(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "1", "10")

        self.sold(account, asset, "1", "11")

    def test_a_sale_rounding_to_zero_cents_is_rejected(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "1", "10")

        self.assert_rejected(self.trade("sell", account, asset, "0.00000001", "1"), "units")

    def test_a_sale_dated_in_the_future_is_rejected(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "1", "10")

        self.assert_rejected(self.trade("sell", account, asset, "1", "10", date="2026-11-17"), "date")

    def test_a_sale_dated_before_the_account_started_is_rejected(self):
        account = self.investment_account(opening_date="2026-11-01")
        asset = self.asset()
        self.bought(account, asset, "1", "10")

        self.assert_rejected(self.trade("sell", account, asset, "1", "10", date="2026-10-31"), "date")

    def test_only_an_investment_account_takes_sales(self):
        account = self.account(type="spending")

        self.assert_rejected(self.trade("sell", account, self.asset(), "1", "10"), "account_id")


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ConcurrentSalesTests(TransactionTestCase):
    """Real commits on separate connections, with the first sale held inside its transaction."""

    def test_a_sale_waits_for_the_one_in_progress_and_cannot_sell_the_same_units(self):
        headers = {"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"}
        clock = mock.patch("accounts.clock.today", return_value=TODAY)
        clock.start()
        self.addCleanup(clock.stop)

        def post(path, body):
            return Client().post(
                path, json.dumps(body), content_type="application/json", headers=headers
            )

        account = post(
            "/api/accounts",
            {
                "name": "Bróker",
                "type": "investment",
                "opening_balance": "1000.00",
                "opening_date": "2026-11-01",
            },
        ).json()
        asset = Asset.objects.create(provider="fake", market="XNAS", symbol="AAPL", name="Apple")
        trade = {"account_id": account["id"], "asset_id": asset.id, "units": "1", "unit_price": "10"}
        post("/api/investments/transactions/buy", trade)

        first_checked = threading.Event()
        second_started = threading.Event()
        first_taken = threading.Lock()
        real_check = InvestmentTransactionSerializer.check_units_to_sell

        def check_then_hold(serializer, *args):
            real_check(serializer, *args)
            if first_taken.acquire(blocking=False):
                # The first sale has passed its check and holds the Account lock, uncommitted.
                first_checked.set()
                second_started.wait(timeout=5)
                time.sleep(0.5)  # long enough for a second sale without the lock to finish

        statuses = {}

        def sell(name):
            try:
                statuses[name] = post("/api/investments/transactions/sell", trade).status_code
            finally:
                connection.close()

        with mock.patch.object(InvestmentTransactionSerializer, "check_units_to_sell", check_then_hold):
            first = threading.Thread(target=sell, args=("first",))
            first.start()
            self.assertTrue(first_checked.wait(timeout=5))
            second = threading.Thread(target=sell, args=("second",))
            second.start()
            second_started.set()
            first.join()
            second.join()

        self.assertEqual(statuses, {"first": 201, "second": 400})


class PositionTests(InvestmentApiTestCase):
    def test_average_cost_follows_the_documented_example(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "2", "100")
        self.sold(account, asset, "1", "150")
        self.bought(account, asset, "1", "200")

        [position] = self.positions()["results"]

        self.assertEqual(position["units"], "2.00000000")
        self.assertEqual(position["cost"], "300.00")
        self.assertEqual(position["average_cost"], "150.00000000")

    def test_a_position_that_reaches_zero_starts_its_cost_over(self):
        account = self.investment_account(opening_balance="5000.00")
        asset = self.asset()
        self.bought(account, asset, "1", "100")
        self.sold(account, asset, "1", "120")
        self.bought(account, asset, "2", "50")

        [position] = self.positions()["results"]

        self.assertEqual(position["cost"], "100.00")
        self.assertEqual(position["average_cost"], "50.00000000")

    def test_the_average_is_not_rounded_to_cents_between_purchases(self):
        account = self.investment_account(opening_balance="5000.00")
        asset = self.asset()
        self.bought(account, asset, "1", "0.10000001")
        self.bought(account, asset, "1", "0.20000002")
        self.sold(account, asset, "1", "1")

        [position] = self.positions()["results"]

        self.assertEqual(position["units"], "1.00000000")
        self.assertEqual(position["average_cost"], "0.15000002")

    def test_the_same_asset_in_two_accounts_is_one_weighted_position(self):
        first = self.investment_account(name="Una")
        second = self.investment_account(name="Otra")
        asset = self.asset()
        self.bought(first, asset, "1", "100")
        self.bought(second, asset, "3", "200")

        body = self.positions()

        self.assertEqual(body["total"], 1)
        [position] = body["results"]
        self.assertEqual(position["units"], "4.00000000")
        self.assertEqual(position["cost"], "700.00")
        self.assertEqual(position["average_cost"], "175.00000000")
        self.assertEqual(
            [(item["account_name"], item["units"], item["average_cost"]) for item in position["accounts"]],
            [("Una", "1.00000000", "100.00000000"), ("Otra", "3.00000000", "200.00000000")],
        )

    def test_each_account_keeps_its_own_average(self):
        first = self.investment_account(name="Una")
        second = self.investment_account(name="Otra")
        asset = self.asset()
        self.bought(first, asset, "2", "100")
        self.bought(second, asset, "2", "300")
        self.sold(second, asset, "1", "50")

        [position] = self.positions()["results"]

        by_account = {item["account_name"]: item for item in position["accounts"]}
        self.assertEqual(by_account["Una"]["average_cost"], "100.00000000")
        self.assertEqual(by_account["Otra"]["average_cost"], "300.00000000")
        self.assertEqual(position["cost"], "500.00")

    def test_value_uses_the_last_known_transaction_price_and_shows_where_it_came_from(self):
        account = self.investment_account(opening_date="2026-11-01")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-11-02")
        self.sold(account, asset, "1", "150", date="2026-11-10")

        [position] = self.positions()["results"]

        self.assertEqual(
            position["price"],
            {"value": "150.00000000", "source": "last_transaction", "date": "2026-11-10", "estimated": True},
        )
        self.assertEqual(position["value"], "150.00")

    def test_the_price_is_the_latest_transaction_across_the_users_accounts(self):
        first = self.investment_account(name="Una")
        second = self.investment_account(name="Otra")
        asset = self.asset()
        self.bought(first, asset, "1", "100", date="2026-11-03")
        self.bought(second, asset, "1", "120", date="2026-11-05")

        [position] = self.positions()["results"]

        self.assertEqual(position["price"]["value"], "120.00000000")
        self.assertEqual(position["value"], "240.00")

    def test_a_past_closing_never_uses_a_later_transaction(self):
        account = self.investment_account(opening_date="2026-11-01")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-11-02")
        self.sold(account, asset, "1", "300", date="2026-11-10")

        body = self.positions(query="?as_of=2026-11-05")

        [position] = body["results"]
        self.assertEqual(body["as_of"], "2026-11-05")
        self.assertEqual(position["units"], "2.00000000")
        self.assertEqual(position["price"]["value"], "100.00000000")
        self.assertEqual(position["price"]["date"], "2026-11-02")

    def test_a_closing_before_the_first_purchase_has_no_positions(self):
        account = self.investment_account(opening_date="2026-11-01")
        self.bought(account, self.asset(), "1", "100", date="2026-11-10")

        self.assertEqual(self.positions(query="?as_of=2026-11-05")["results"], [])

    def test_a_closing_in_the_future_or_malformed_is_rejected(self):
        for value in ("2026-11-17", "yesterday"):
            with self.subTest(value=value):
                response = self.call("GET", f"/api/investments/positions?as_of={value}")
                self.assert_rejected(response, "as_of")

    def test_each_position_shows_its_share_of_the_portfolio_value(self):
        account = self.investment_account(opening_balance="5000.00")
        self.bought(account, self.asset("AAPL"), "1", "300")
        self.bought(account, self.asset("MSFT"), "1", "100")

        results = self.positions()["results"]

        self.assertEqual(
            [(item["asset"]["symbol"], item["value"], item["portfolio_percent"]) for item in results],
            [("AAPL", "300.00", "75.00"), ("MSFT", "100.00", "25.00")],
        )

    def test_cash_does_not_count_in_the_share(self):
        account = self.investment_account(opening_balance="999999.00")
        self.bought(account, self.asset(), "1", "10")

        [position] = self.positions()["results"]

        self.assertEqual(position["portfolio_percent"], "100.00")

    def test_the_share_does_not_apply_when_the_portfolio_has_no_value(self):
        account = self.investment_account()
        asset = self.asset("TINY")
        self.bought(account, asset, "1", "1")
        self.sold(account, asset, "0.99999999", "1")

        [position] = self.positions()["results"]

        self.assertEqual(position["value"], "0.00")
        self.assertIsNone(position["portfolio_percent"])

    def test_positions_are_the_users_own(self):
        mine = self.investment_account(user=1)
        theirs = self.investment_account(user=2)
        asset = self.asset()
        self.bought(mine, asset, "1", "10")
        self.bought(theirs, asset, "9", "10", user=2)

        self.assertEqual(self.positions(user=1)["results"][0]["units"], "1.00000000")
        self.assertEqual(self.positions(user=3)["results"], [])

    def test_a_sale_that_empties_a_position_removes_it_from_the_list(self):
        account = self.investment_account()
        asset = self.asset()
        self.bought(account, asset, "1", "10")
        self.sold(account, asset, "1", "10")

        body = self.positions()

        self.assertEqual((body["results"], body["total"]), ([], 0))

    def test_a_page_size_over_the_maximum_is_rejected(self):
        response = self.call("GET", "/api/investments/positions?page_size=500")

        self.assert_rejected(response, "page_size")

    def test_positions_need_the_service_credentials(self):
        self.assertEqual(self.client.get("/api/investments/positions").status_code, 403)


class TransactionsApiTestCase(InvestmentApiTestCase):
    def listed(self, query="", user=1):
        response = self.call("GET", f"/api/investments/transactions{query}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def read(self, recorded, user=1):
        return self.call("GET", f"/api/investments/transactions/{recorded['id']}", user=user)

    def edited(self, recorded, user=1, **changes):
        """A PUT that sends every field of the recorded operation, with `changes` applied."""
        body = {
            "account_id": recorded["account_id"],
            "asset_id": recorded["asset_id"],
            "units": recorded["units"],
            "unit_price": recorded["unit_price"],
            "date": recorded["date"],
            **changes,
        }
        return self.call("PUT", f"/api/investments/transactions/{recorded['id']}", body, user=user)

    def removed(self, recorded, user=1):
        return self.call("DELETE", f"/api/investments/transactions/{recorded['id']}", user=user)

    def bourse(self, name="Bróker", **fields):
        return self.investment_account(name=name, opening_date="2026-01-01", **fields)


class TransactionListTests(TransactionsApiTestCase):
    def test_lists_the_operations_newest_first_with_their_asset(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        first = self.bought(account, asset, "2", "100", date="2026-03-10")
        second = self.bought(account, asset, "1", "100", date="2026-06-10")
        third = self.bought(account, asset, "1", "50", date="2026-06-10")

        listed = self.listed()

        self.assertEqual(
            [item["id"] for item in listed["results"]], [third["id"], second["id"], first["id"]]
        )
        self.assertEqual(listed["results"][0]["asset"]["symbol"], "AAPL")
        self.assertEqual(listed["results"][0]["cash_amount"], "50.00")
        self.assertNotIn("account_balance", listed["results"][0])
        self.assertEqual((listed["total"], listed["next_page"]), (3, None))

    def test_lists_only_the_users_operations(self):
        mine = self.bourse(user=1, opening_balance="1000.00")
        theirs = self.bourse(user=2, opening_balance="1000.00")
        asset = self.asset()
        own = self.bought(mine, asset, "1", "10", user=1)
        self.bought(theirs, asset, "1", "10", user=2)

        listed = self.listed(user=1)

        self.assertEqual([item["id"] for item in listed["results"]], [own["id"]])

    def test_pages_follow_the_listing_contract(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        for day in ("10", "11", "12"):
            self.bought(account, asset, "1", "10", date=f"2026-03-{day}")

        second_page = self.listed("?page_size=2&page=2")
        self.assertEqual(len(second_page["results"]), 1)
        self.assertEqual((second_page["total"], second_page["next_page"]), (3, None))
        self.assertEqual(self.listed("?page_size=2")["next_page"], 2)
        self.assertEqual(self.call("GET", "/api/investments/transactions?page_size=201").status_code, 400)
        self.assertEqual(self.call("GET", "/api/investments/transactions?page=3&page_size=2").status_code, 400)


class TransactionReadTests(TransactionsApiTestCase):
    def test_returns_one_operation_with_its_asset(self):
        account = self.bourse(opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "2", "100")

        response = self.read(recorded)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], recorded["id"])
        self.assertEqual(body["asset"]["symbol"], "AAPL")
        self.assertEqual((body["units"], body["cash_amount"]), ("2.00000000", "200.00"))

    def test_another_users_operation_is_not_found(self):
        recorded = self.bought(self.bourse(user=1, opening_balance="1000.00"), self.asset(), "1", "10")

        response = self.read(recorded, user=2)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "not_found"})

    def test_an_unknown_operation_is_not_found(self):
        response = self.call("GET", "/api/investments/transactions/999999")

        self.assertEqual(response.status_code, 404)


class TransactionEditTests(TransactionsApiTestCase):
    def test_a_correction_recalculates_the_cash_and_the_position(self):
        account = self.bourse(opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "2", "100", date="2026-03-10")

        response = self.edited(recorded, units="3")

        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual((body["units"], body["cash_amount"]), ("3.00000000", "300.00"))
        self.assertEqual(body["account_balance"], "700.00")
        self.assertEqual(self.balance(account), "700.00")
        self.assertEqual(self.positions()["results"][0]["units"], "3.00000000")

    def test_a_correction_that_strands_a_later_sale_is_rejected_and_changes_nothing(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        purchase = self.bought(account, asset, "5", "100", date="2026-03-10")
        self.sold(account, asset, "5", "120", date="2026-06-10")
        before = (self.balance(account), self.positions())

        response = self.edited(purchase, units="4")

        self.assert_rejected(response, "units")
        message = response.json()["errors"]["units"][0]
        self.assertIn("No puedes guardar este cambio", message)
        self.assertIn("la venta del 10 jun 2026 vende 5 unidades", message)
        self.assertIn("ese día solo tendrías 4", message)
        self.assertEqual((self.balance(account), self.positions()), before)

    def test_moving_a_purchase_after_a_sale_is_rejected(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        purchase = self.bought(account, asset, "5", "100", date="2026-03-10")
        self.sold(account, asset, "5", "120", date="2026-06-10")

        response = self.edited(purchase, date="2026-07-01")

        self.assert_rejected(response, "units")
        self.assertIn("ese día solo tendrías 0", response.json()["errors"]["units"][0])

    def test_moving_a_purchase_to_another_account_checks_the_position_it_leaves(self):
        origin = self.bourse(name="Bróker", opening_balance="1000.00")
        destination = self.bourse(name="Otro bróker", opening_balance="1000.00")
        asset = self.asset()
        purchase = self.bought(origin, asset, "5", "100", date="2026-03-10")
        self.sold(origin, asset, "5", "120", date="2026-06-10")

        response = self.edited(purchase, account_id=destination["id"])

        self.assert_rejected(response, "units")

    def test_moving_a_sale_to_an_account_without_units_is_rejected(self):
        origin = self.bourse(name="Bróker", opening_balance="1000.00")
        destination = self.bourse(name="Otro bróker", opening_balance="1000.00")
        asset = self.asset()
        self.bought(origin, asset, "5", "100", date="2026-03-10")
        sale = self.sold(origin, asset, "5", "120", date="2026-06-10")

        response = self.edited(sale, account_id=destination["id"])

        self.assert_rejected(response, "units")
        self.assertIn("la venta del 10 jun 2026 vende 5 unidades", response.json()["errors"]["units"][0])

    def test_changing_the_asset_checks_the_position_it_leaves(self):
        account = self.bourse(opening_balance="1000.00")
        apple = self.asset()
        other = self.asset(symbol="MSFT", name="Microsoft")
        purchase = self.bought(account, apple, "5", "100", date="2026-03-10")
        self.sold(account, apple, "5", "120", date="2026-06-10")

        response = self.edited(purchase, asset_id=other.id)

        self.assert_rejected(response, "units")

    def test_a_correction_of_the_price_changes_later_average_costs_and_the_balance(self):
        account = self.bourse(opening_balance="10000.00")
        asset = self.asset()
        self.bought(account, asset, "10", "100", date="2026-03-10")
        second = self.bought(account, asset, "10", "200", date="2026-04-10")
        self.sold(account, asset, "5", "180", date="2026-05-10")
        self.assertEqual(self.positions()["results"][0]["average_cost"], "150.00000000")

        response = self.edited(second, unit_price="300")

        self.assertEqual(response.status_code, 200, response.content)
        position = self.positions()["results"][0]
        self.assertEqual(
            (position["units"], position["cost"], position["average_cost"]),
            ("15.00000000", "3000.00", "200.00000000"),
        )
        self.assertEqual(self.balance(account), "6900.00")

    def test_a_sale_on_the_day_of_its_purchase_keeps_its_place_after_a_correction(self):
        account = self.bourse(opening_balance="10000.00")
        asset = self.asset()
        purchase = self.bought(account, asset, "10", "100", date="2026-06-10")
        self.sold(account, asset, "5", "120", date="2026-06-10")

        self.assertEqual(self.edited(purchase, units="12").status_code, 200)
        response = self.edited(purchase, units="4")

        self.assertIn("ese día solo tendrías 4", response.json()["errors"]["units"][0])

    def test_a_correction_needs_the_date(self):
        account = self.bourse(opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "1", "10")

        response = self.call(
            "PUT",
            f"/api/investments/transactions/{recorded['id']}",
            {"account_id": account["id"], "asset_id": recorded["asset_id"], "units": "1", "unit_price": "10"},
        )

        self.assert_rejected(response, "date")

    def test_a_correction_refuses_a_change_of_kind_as_an_unknown_field(self):
        account = self.bourse(opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "1", "10")

        response = self.edited(recorded, type="sell")

        self.assert_rejected(response, "type")
        self.assertEqual(self.read(recorded).json()["type"], "buy")

    def test_a_correction_keeps_the_date_within_the_account_and_today(self):
        account = self.bourse(opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "1", "10", date="2026-03-10")

        self.assert_rejected(self.edited(recorded, date="2999-01-01"), "date")
        self.assert_rejected(self.edited(recorded, date="2025-12-31"), "date")

    def test_another_users_operation_cannot_be_corrected(self):
        account = self.bourse(user=1, opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "1", "10", user=1)

        response = self.edited(recorded, user=2, units="2")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.read(recorded).json()["units"], "1.00000000")

    def test_an_archived_account_keeps_its_operations_correctable_but_takes_no_move_into_it(self):
        old = self.bourse(name="Bróker vieja", opening_balance="1000.00")
        new = self.bourse(name="Bróker nueva", opening_balance="1000.00")
        asset = self.asset()
        recorded = self.bought(old, asset, "2", "100")
        self.bought(new, self.asset(symbol="MSFT", name="Microsoft"), "1", "10")
        self.archive(old)
        self.archive(new)

        self.assertEqual(self.edited(recorded, units="3").status_code, 200)
        self.assert_rejected(self.edited(recorded, account_id=new["id"]), "account_id")


class TransactionDeleteTests(TransactionsApiTestCase):
    def test_deleting_a_purchase_returns_its_cash_and_units(self):
        account = self.bourse(opening_balance="1000.00")
        purchase = self.bought(account, self.asset(), "2", "100")

        self.assertEqual(self.removed(purchase).status_code, 204)

        self.assertEqual(self.balance(account), "1000.00")
        self.assertEqual(self.positions()["results"], [])
        self.assertEqual(self.listed()["total"], 0)

    def test_deleting_a_purchase_a_later_sale_needs_is_rejected_and_changes_nothing(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        purchase = self.bought(account, asset, "5", "100", date="2026-03-10")
        self.sold(account, asset, "5", "120", date="2026-06-10")
        before = (self.balance(account), self.positions())

        response = self.removed(purchase)

        self.assert_rejected(response, "form")
        self.assertIn("No puedes eliminar esta compra", response.json()["errors"]["form"][0])
        self.assertIn("la venta del 10 jun 2026 vende 5 unidades", response.json()["errors"]["form"][0])
        self.assertEqual(self.read(purchase).status_code, 200)
        self.assertEqual((self.balance(account), self.positions()), before)

    def test_deleting_a_sale_gives_its_units_back_to_the_position(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "5", "100", date="2026-03-10")
        sale = self.sold(account, asset, "2", "120", date="2026-06-10")

        self.assertEqual(self.removed(sale).status_code, 204)

        self.assertEqual(self.positions()["results"][0]["units"], "5.00000000")
        self.assertEqual(self.balance(account), "500.00")

    def test_another_purchase_on_the_same_day_covers_the_sale_when_one_is_deleted(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        first = self.bought(account, asset, "5", "100", date="2026-03-10")
        self.bought(account, asset, "5", "100", date="2026-03-10")
        self.sold(account, asset, "5", "120", date="2026-06-10")

        self.assertEqual(self.removed(first).status_code, 204)

    def test_an_operation_of_an_archived_account_can_be_deleted(self):
        account = self.bourse(opening_balance="1000.00")
        other = self.bourse(name="Otro bróker", opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "1", "10")
        self.bought(other, self.asset(symbol="MSFT", name="Microsoft"), "1", "10")
        self.archive(account)

        self.assertEqual(self.removed(recorded).status_code, 204)

    def test_another_users_operation_cannot_be_deleted(self):
        account = self.bourse(user=1, opening_balance="1000.00")
        recorded = self.bought(account, self.asset(), "1", "10", user=1)

        self.assertEqual(self.removed(recorded, user=2).status_code, 404)
        self.assertEqual(self.read(recorded).status_code, 200)


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ConcurrentChangeTests(TransactionTestCase):
    """Real commits on separate connections: a deletion and a sale of the same units must queue up."""

    def test_a_deletion_and_a_sale_cannot_both_succeed(self):
        headers = {"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"}
        patcher = mock.patch("accounts.clock.today", return_value=TODAY)
        patcher.start()
        self.addCleanup(patcher.stop)

        def post(path, body):
            return Client().post(path, json.dumps(body), content_type="application/json", headers=headers)

        account_response = post(
            "/api/accounts",
            {
                "name": "Bróker",
                "type": "investment",
                "opening_balance": "1000.00",
                "opening_date": "2026-11-01",
            },
        )
        self.assertEqual(account_response.status_code, 201, account_response.content)
        account = account_response.json()
        asset = Asset.objects.create(provider="fake", market="XNAS", symbol="AAPL", name="Apple")
        trade = {"account_id": account["id"], "asset_id": asset.id, "units": "10", "unit_price": "10"}
        purchase_response = post("/api/investments/transactions/buy", trade)
        self.assertEqual(purchase_response.status_code, 201, purchase_response.content)
        purchase = purchase_response.json()

        outcomes = {}
        barrier = threading.Barrier(2)

        def delete():
            try:
                barrier.wait()
                outcomes["deletion"] = (
                    Client()
                    .delete(f"/api/investments/transactions/{purchase['id']}", headers=headers)
                    .status_code
                )
            finally:
                connection.close()

        def sell():
            try:
                barrier.wait()
                outcomes["sale"] = post("/api/investments/transactions/sell", trade).status_code
            finally:
                connection.close()

        threads = [threading.Thread(target=delete), threading.Thread(target=sell)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        succeeded = [name for name, status in outcomes.items() if status < 300]
        refused = [name for name, status in outcomes.items() if status == 400]
        self.assertEqual(len(succeeded), 1, outcomes)
        self.assertEqual(len(refused), 1, outcomes)

        remaining = InvestmentTransaction.objects.filter(account_id=account["id"]).count()
        self.assertEqual(remaining, 0 if succeeded == ["deletion"] else 2)


class SampleProviderTests(InvestmentApiTestCase):
    @override_settings(QUOTES_PROVIDER="sample")
    def test_the_sample_catalog_answers_without_a_key_and_keeps_markets_apart(self):
        response = self.call("GET", "/api/investments/assets/search?q=shop")

        body = response.json()
        self.assertTrue(body["provider_available"])
        self.assertEqual(sorted(item["market"] for item in body["results"]), ["XNYS", "XTSE"])


class PerformanceTestCase(InvestmentApiTestCase):
    def transfer(self, source, destination, amount, user=1, **fields):
        body = {
            "amount": amount,
            "source_account_id": source["id"],
            "destination_account_id": destination["id"],
            **fields,
        }
        response = self.call("POST", "/api/transfers", body, user=user)
        self.assertEqual(response.status_code, 201, response.content)

    def read(self, name, user=1, query=""):
        response = self.call("GET", f"/api/investments/{name}{query}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def set_price(self, asset, value, user=1, **fields):
        return self.call(
            "PUT", f"/api/investments/assets/{asset.id}/price", {"value": value, **fields}, user=user
        )


class ReturnTests(PerformanceTestCase):
    def test_a_gain_is_value_minus_net_contribution_with_the_opening_balance_as_first_contribution(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "50", date="2026-11-02")
        self.set_price(asset, "62.50")

        body = self.read("dashboard")

        # Cash 500.00 plus 10 units at 62.50, against 1,000.00 put in.
        self.assertEqual(body["cash"], "500.00")
        self.assertEqual(body["positions_value"], "625.00")
        self.assertEqual(body["value"], "1125.00")
        self.assertEqual(body["net_contribution"], "1000.00")
        self.assertEqual(body["return"], {"amount": "125.00", "percent": "12.50"})
        [account] = body["accounts"]
        self.assertEqual(account["return"], {"amount": "125.00", "percent": "12.50"})

    def test_a_loss_is_negative_in_money_and_in_percent(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "100", date="2026-11-02")
        self.set_price(asset, "70")

        body = self.read("dashboard")

        self.assertEqual(body["value"], "700.00")
        self.assertEqual(body["return"], {"amount": "-300.00", "percent": "-30.00"})

    def test_a_sale_below_cost_that_is_cashed_out_still_counts_as_a_loss(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "100", date="2026-11-02")
        self.sold(broker, asset, "10", "80", date="2026-11-03")

        body = self.read("performance")

        self.assertEqual(body["positions_value"], "0.00")
        self.assertEqual(body["return"], {"amount": "-200.00", "percent": "-20.00"})
        self.assertEqual(body["positions"], [])

    def test_a_withdrawal_lowers_the_net_contribution_and_not_the_return(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        savings = self.account(name="Ahorro", type="savings", opening_balance="0.00")
        self.transfer(broker, savings, "400.00")

        body = self.read("dashboard")

        self.assertEqual(body["net_contribution"], "600.00")
        self.assertEqual(body["cash"], "600.00")
        self.assertEqual(body["return"], {"amount": "0.00", "percent": "0.00"})

    def test_a_contribution_by_transfer_raises_the_net_contribution(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        spending = self.account(name="Corriente", opening_balance="800.00")
        self.transfer(spending, broker, "300.00")

        body = self.read("dashboard")

        self.assertEqual(body["net_contribution"], "1300.00")
        self.assertEqual(body["return"]["amount"], "0.00")

    def test_a_transfer_between_two_investment_accounts_cancels_in_the_portfolio(self):
        first = self.investment_account(name="Una", opening_balance="1000.00")
        second = self.investment_account(name="Otra", opening_balance="500.00")
        self.transfer(first, second, "250.00")

        body = self.read("dashboard")

        by_name = {item["name"]: item for item in body["accounts"]}
        self.assertEqual(by_name["Una"]["net_contribution"], "750.00")
        self.assertEqual(by_name["Otra"]["net_contribution"], "750.00")
        self.assertEqual(body["net_contribution"], "1500.00")
        self.assertEqual(body["value"], "1500.00")
        self.assertEqual(body["return"]["amount"], "0.00")

    def test_the_percent_does_not_apply_without_a_positive_net_contribution(self):
        broker = self.investment_account(opening_balance="0.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "1", "100", date="2026-11-02")

        body = self.read("dashboard")

        self.assertEqual(body["net_contribution"], "0.00")
        self.assertEqual(body["return"]["percent"], None)

    def test_an_archived_account_still_counts_in_the_portfolio(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        self.bought(broker, self.asset(), "1", "100", date="2026-11-02")
        self.archive(broker)

        body = self.read("dashboard")

        self.assertEqual(body["value"], "1000.00")
        self.assertTrue(body["accounts"][0]["archived"])

    def test_other_account_types_stay_out_of_the_portfolio(self):
        self.account(name="Corriente", opening_balance="5000.00")
        self.account(name="Ahorro", type="savings", opening_balance="2000.00")

        body = self.read("dashboard")

        self.assertEqual(body["accounts"], [])
        self.assertEqual(body["value"], "0.00")
        self.assertEqual(body["return"], {"amount": "0.00", "percent": None})

    def test_exact_cents_survive_large_values(self):
        broker = self.investment_account(opening_balance="900000000000.01", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "3", "0.01", date="2026-11-02")
        self.set_price(asset, "0.01")

        body = self.read("dashboard")

        self.assertEqual(body["value"], "900000000000.01")
        self.assertEqual(body["return"]["amount"], "0.00")

    def test_the_distribution_lists_each_asset_by_value_with_its_share(self):
        broker = self.investment_account(opening_balance="2000.00", opening_date="2026-11-01")
        self.bought(broker, self.asset("AAPL"), "1", "300", date="2026-11-02")
        self.bought(broker, self.asset("MSFT", name="Microsoft"), "1", "100", date="2026-11-02")

        body = self.read("dashboard")

        self.assertEqual(
            [(item["asset"]["symbol"], item["value"], item["portfolio_percent"]) for item in body["distribution"]],
            [("AAPL", "300.00", "75.00"), ("MSFT", "100.00", "25.00")],
        )
        self.assertIsNone(body["others_value"])

    def test_the_performance_lists_what_each_position_gained_against_its_cost(self):
        broker = self.investment_account(opening_balance="2000.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "4", "100", date="2026-11-02")
        self.set_price(asset, "90")

        [position] = self.read("performance")["positions"]

        self.assertEqual((position["cost"], position["value"]), ("400.00", "360.00"))
        self.assertEqual((position["gain"], position["gain_percent"]), ("-40.00", "-10.00"))

    def test_the_figures_are_each_users_own(self):
        broker = self.investment_account(opening_balance="1000.00")
        self.bought(broker, self.asset(), "1", "100", date="2026-11-02")

        body = self.read("dashboard", user=2)

        self.assertEqual(body["accounts"], [])
        self.assertEqual(body["distribution"], [])

    def test_a_future_closing_is_refused(self):
        response = self.call("GET", "/api/investments/dashboard?as_of=2026-11-17")

        self.assertEqual(response.status_code, 400)


class ReferencePriceTests(PerformanceTestCase):
    def setUp(self):
        super().setUp()
        self.broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        self.asset_held = self.asset()
        self.bought(self.broker, self.asset_held, "2", "100", date="2026-11-02")

    def test_without_a_manual_price_the_last_transaction_is_an_estimate_with_its_date(self):
        body = self.read("dashboard")

        [item] = body["distribution"]
        self.assertEqual(
            item["price"],
            {"value": "100.00000000", "source": "last_transaction", "date": "2026-11-02", "estimated": True},
        )
        self.assertTrue(body["estimated"])

    def test_a_manual_price_is_saved_with_its_date_and_valued_as_not_estimated(self):
        response = self.set_price(self.asset_held, "125.5", date="2026-11-10")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            response.json()["price"],
            {"value": "125.50000000", "source": "manual", "date": "2026-11-10", "estimated": False},
        )
        body = self.read("dashboard")
        self.assertEqual(body["positions_value"], "251.00")
        self.assertFalse(body["estimated"])

    def test_the_price_date_defaults_to_today(self):
        self.assertEqual(self.set_price(self.asset_held, "110").json()["price"]["date"], "2026-11-16")

    def test_a_correction_the_same_day_replaces_the_price(self):
        self.set_price(self.asset_held, "110")
        self.set_price(self.asset_held, "130")

        self.assertEqual(self.read("positions")["results"][0]["price"]["value"], "130.00000000")

    def test_a_manual_price_older_than_the_last_transaction_does_not_win(self):
        self.set_price(self.asset_held, "999", date="2026-11-01")

        [position] = self.read("positions")["results"]

        self.assertEqual(position["price"]["source"], "last_transaction")

    def test_a_manual_price_never_applies_to_a_closing_before_its_date(self):
        self.set_price(self.asset_held, "150", date="2026-11-10")

        [position] = self.read("positions", query="?as_of=2026-11-05")["results"]

        self.assertEqual(position["price"]["value"], "100.00000000")

    def test_a_future_price_is_refused(self):
        response = self.set_price(self.asset_held, "150", date="2026-11-17")

        self.assertEqual(response.status_code, 400)
        self.assertIn("date", response.json()["errors"])

    def test_a_price_must_be_positive_with_up_to_eight_decimals(self):
        for value in ("0", "-5", "abc", "1.123456789", 5):
            with self.subTest(value=value):
                self.assertEqual(self.set_price(self.asset_held, value).status_code, 400)

    def test_an_unknown_asset_is_not_found(self):
        response = self.call("PUT", "/api/investments/assets/9999/price", {"value": "5"})

        self.assertEqual(response.status_code, 404)

    def test_a_price_of_one_user_never_changes_the_valuation_of_another(self):
        other = self.investment_account(user=2, opening_balance="1000.00", opening_date="2026-11-01")
        self.bought(other, self.asset_held, "2", "100", user=2, date="2026-11-02")

        self.set_price(self.asset_held, "500", user=1)

        mine = self.read("dashboard", user=1)
        theirs = self.read("dashboard", user=2)
        self.assertEqual(mine["positions_value"], "1000.00")
        self.assertEqual(theirs["positions_value"], "200.00")
        self.assertEqual(theirs["distribution"][0]["price"]["source"], "last_transaction")

    def test_reading_the_price_of_an_asset_answers_each_user_with_their_own(self):
        self.set_price(self.asset_held, "180")

        mine = self.call("GET", f"/api/investments/assets/{self.asset_held.id}/price").json()
        theirs = self.call("GET", f"/api/investments/assets/{self.asset_held.id}/price", user=2).json()

        self.assertEqual(mine["price"]["value"], "180.00000000")
        self.assertEqual(mine["asset"]["symbol"], "AAPL")
        # A User with nothing to base a price on gets none, never zero.
        self.assertIsNone(theirs["price"])

    def test_a_price_cannot_be_set_without_a_value(self):
        response = self.call("PUT", f"/api/investments/assets/{self.asset_held.id}/price", {})

        self.assertEqual(response.status_code, 400)
        self.assertIn("value", response.json()["errors"])


class PastDayAndPeriodTests(PerformanceTestCase):
    def test_a_past_day_uses_the_cash_and_net_contribution_of_that_day(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        spending = self.account(name="Corriente", opening_balance="800.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "5", "100", date="2026-11-03")
        self.transfer(spending, broker, "300.00", date="2026-11-10")

        before = self.read("dashboard", query="?as_of=2026-11-05")
        after = self.read("dashboard")

        self.assertEqual(before["as_of"], "2026-11-05")
        self.assertEqual(before["cash"], "500.00")
        self.assertEqual(before["net_contribution"], "1000.00")
        self.assertEqual(before["value"], "1000.00")
        self.assertEqual(after["cash"], "800.00")
        self.assertEqual(after["net_contribution"], "1300.00")

    def test_an_account_that_starts_after_the_day_is_not_part_of_it(self):
        self.investment_account(name="Vieja", opening_balance="1000.00", opening_date="2026-11-01")
        self.investment_account(name="Nueva", opening_balance="400.00", opening_date="2026-11-10")

        before = self.read("performance", query="?as_of=2026-11-05")

        self.assertEqual([account["name"] for account in before["accounts"]], ["Vieja"])
        self.assertEqual(before["net_contribution"], "1000.00")
        self.assertEqual(before["value"], "1000.00")

    def test_a_past_day_values_positions_with_the_prices_known_then(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "50", date="2026-11-02")
        self.set_price(asset, "80", date="2026-11-12")

        body = self.read("performance", query="?as_of=2026-11-05")

        self.assertEqual(body["positions_value"], "500.00")
        self.assertEqual(body["return"]["amount"], "0.00")
        self.assertEqual(body["positions"][0]["price"]["source"], "last_transaction")

    def test_the_period_return_is_the_difference_between_two_cumulative_returns(self):
        # Aporte neto $100: worth $110 at the start of the period and $115 at its close.
        broker = self.investment_account(opening_balance="100.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "1", "100", date="2026-11-01")
        self.set_price(asset, "110", date="2026-11-05")
        self.set_price(asset, "115", date="2026-11-10")

        body = self.read("performance", query="?from=2026-11-06")

        self.assertEqual(body["return"]["amount"], "15.00")
        self.assertEqual(
            body["period"],
            {
                "from": "2026-11-06",
                "to": "2026-11-16",
                "opening_return": "10.00",
                "closing_return": "15.00",
                "return": "5.00",
            },
        )

    def test_a_contribution_inside_the_period_is_not_return(self):
        broker = self.investment_account(opening_balance="100.00", opening_date="2026-11-01")
        spending = self.account(name="Corriente", opening_balance="500.00", opening_date="2026-11-01")
        self.transfer(spending, broker, "200.00", date="2026-11-08")

        body = self.read("performance", query="?from=2026-11-06")

        self.assertEqual(body["net_contribution"], "300.00")
        self.assertEqual(body["period"]["return"], "0.00")

    def test_a_loss_in_the_period_is_negative(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "100", date="2026-11-01")
        self.set_price(asset, "90", date="2026-11-10")

        body = self.read("performance", query="?from=2026-11-05")

        self.assertEqual(body["period"]["return"], "-100.00")

    def test_a_period_may_close_on_a_past_day(self):
        broker = self.investment_account(opening_balance="100.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "1", "100", date="2026-11-01")
        self.set_price(asset, "110", date="2026-11-05")
        self.set_price(asset, "115", date="2026-11-10")

        body = self.read("performance", query="?from=2026-11-02&as_of=2026-11-07")

        self.assertEqual(body["period"]["return"], "10.00")

    def test_a_bad_period_start_is_refused(self):
        for query in ("?from=hoy", "?from=2026-11-10&as_of=2026-11-05"):
            with self.subTest(query=query):
                response = self.call("GET", f"/api/investments/performance{query}")
                self.assertEqual(response.status_code, 400)
                self.assertIn("from", response.json()["errors"])

    def test_without_a_start_there_is_no_period(self):
        self.investment_account()

        self.assertIsNone(self.read("performance")["period"])


class CommissionTests(TransactionsApiTestCase):
    def test_a_purchase_commission_takes_cash_and_joins_the_cost(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()

        recorded = self.bought(account, asset, "2", "100", commission="1.50")

        self.assertEqual(recorded["commission"], "1.50")
        self.assertEqual(recorded["cash_amount"], "200.00")
        self.assertEqual(recorded["account_balance"], "798.50")
        [position] = self.positions()["results"]
        self.assertEqual(position["cost"], "201.50")
        self.assertEqual(position["average_cost"], "100.75000000")

    def test_a_sale_commission_reduces_the_cash_received_and_leaves_the_cost_alone(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")

        sale = self.sold(account, asset, "1", "150", commission="2.25", date="2026-04-10")

        self.assertEqual(sale["account_balance"], "947.75")
        [position] = self.positions()["results"]
        self.assertEqual(position["cost"], "100.00")

    def test_the_commission_is_optional_and_zero_by_default(self):
        account = self.bourse(opening_balance="1000.00")

        recorded = self.bought(account, self.asset(), "1", "10")

        self.assertEqual(recorded["commission"], "0.00")
        self.assertEqual(recorded["account_balance"], "990.00")

    def test_a_commission_is_never_negative_or_beyond_cents(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()

        for value in ("-1.00", "1.005", "abc", 1.5):
            with self.subTest(value=value):
                response = self.trade("buy", account, asset, "1", "10", commission=value)
                self.assert_rejected(response, "commission")
        self.assertEqual(self.balance(account), "1000.00")

    def test_the_commission_is_kept_exact_in_a_large_cost(self):
        account = self.bourse(opening_balance="1000000000.00")
        asset = self.asset()

        self.bought(account, asset, "3", "333333333.33333333", commission="0.01")

        [position] = self.positions()["results"]
        self.assertEqual(position["cost"], "1000000000.01")

    def test_correcting_a_purchase_commission_changes_a_later_sale_cost_and_the_balance(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        purchase = self.bought(account, asset, "2", "100", commission="10.00", date="2026-03-10")
        self.sold(account, asset, "1", "150", date="2026-04-10")
        self.assertEqual(self.positions()["results"][0]["cost"], "105.00")

        response = self.edited(purchase, commission="0.00")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.positions()["results"][0]["cost"], "100.00")
        self.assertEqual(self.balance(account), "950.00")

    def test_a_commission_leaves_the_net_contribution_alone_and_lowers_the_return(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "10", "50", commission="5.00", date="2026-11-02")
        self.call("PUT", f"/api/investments/assets/{asset.id}/price", {"value": "50"})

        body = self.call("GET", "/api/investments/dashboard").json()

        self.assertEqual(body["net_contribution"], "1000.00")
        self.assertEqual(body["return"]["amount"], "-5.00")


class DividendTests(TransactionsApiTestCase):
    def dividend(self, account, asset, amount, user=1, **fields):
        body = {"account_id": account["id"], "asset_id": asset.id, "amount": amount, **fields}
        return self.call("POST", "/api/investments/transactions/dividend", body, user=user)

    def paid(self, account, asset, amount, user=1, **fields):
        response = self.dividend(account, asset, amount, user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def correct(self, paid, account, asset, **changes):
        body = {
            "account_id": account["id"],
            "asset_id": asset.id,
            "amount": paid["cash_amount"],
            "date": paid["date"],
            **changes,
        }
        return self.call("PUT", f"/api/investments/transactions/{paid['id']}", body)

    def dashboard(self, query=""):
        return self.call("GET", f"/api/investments/dashboard{query}").json()

    def test_a_dividend_adds_cash_and_shows_without_units(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")

        recorded = self.paid(account, asset, "12.40", date="2026-04-01")

        self.assertEqual(recorded["type"], "dividend")
        self.assertEqual(recorded["cash_amount"], "12.40")
        self.assertIsNone(recorded["units"])
        self.assertEqual(recorded["account_balance"], "812.40")
        self.assertEqual(self.balance(account), "812.40")

    def test_a_dividend_counts_as_return_and_not_as_contribution(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "10", "50", date="2026-11-02")
        self.call("PUT", f"/api/investments/assets/{asset.id}/price", {"value": "50"})
        before = self.dashboard()

        self.paid(account, asset, "7.35", date="2026-11-03")

        after = self.dashboard()
        self.assertEqual(before["return"]["amount"], "0.00")
        self.assertEqual(after["return"], {"amount": "7.35", "percent": "0.74"})
        self.assertEqual(after["net_contribution"], before["net_contribution"])
        self.assertEqual(after["cash"], "507.35")

    def test_the_return_of_a_period_includes_only_the_dividends_paid_in_it(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "10", "50", date="2026-11-02")
        self.call("PUT", f"/api/investments/assets/{asset.id}/price", {"value": "50", "date": "2026-11-02"})
        self.paid(account, asset, "5.00", date="2026-11-03")
        self.paid(account, asset, "7.00", date="2026-11-10")

        body = self.call("GET", "/api/investments/performance?from=2026-11-05").json()

        self.assertEqual(body["return"]["amount"], "12.00")
        self.assertEqual(body["period"]["return"], "7.00")
        self.assertEqual(body["net_contribution"], "1000.00")

    def test_a_closing_before_a_dividend_does_not_see_it(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "10", "50", date="2026-11-02")
        self.paid(account, asset, "7.00", date="2026-11-10")

        body = self.dashboard("?as_of=2026-11-05")

        self.assertEqual(body["cash"], "500.00")

    def test_a_dividend_never_sets_the_price_or_changes_the_position(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")

        self.paid(account, asset, "5.00", date="2026-04-01")

        [position] = self.positions()["results"]
        self.assertEqual(
            (position["units"], position["cost"], position["price"]["value"]),
            ("2.00000000", "200.00", "100.00000000"),
        )

    def test_a_dividend_of_an_asset_the_user_does_not_hold_is_rejected(self):
        account = self.bourse(opening_balance="1000.00")

        response = self.dividend(account, self.asset(), "5.00")

        self.assert_rejected(response, "asset_id")
        self.assertEqual(self.balance(account), "1000.00")

    def test_a_dividend_before_the_first_purchase_is_rejected(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")

        self.assert_rejected(self.dividend(account, asset, "5.00", date="2026-03-01"), "asset_id")

    def test_a_dividend_of_units_held_in_another_account_is_rejected(self):
        asset = self.asset()
        holder = self.bourse(name="Uno")
        other = self.bourse(name="Otro")
        self.bought(holder, asset, "2", "100")

        self.assert_rejected(self.dividend(other, asset, "5.00"), "asset_id")

    def test_a_dividend_amount_is_positive_with_two_decimals(self):
        account = self.bourse()
        asset = self.asset()
        self.bought(account, asset, "2", "100")

        for value in ("0", "0.00", "-1.00", "1.005", "abc", 5):
            with self.subTest(value=value):
                self.assert_rejected(self.dividend(account, asset, value), "amount")

    def test_a_dividend_takes_no_units_price_or_commission(self):
        account = self.bourse()
        asset = self.asset()
        self.bought(account, asset, "2", "100")

        for name in ("units", "unit_price", "commission"):
            with self.subTest(name=name):
                self.assert_rejected(self.dividend(account, asset, "5.00", **{name: "1"}), name)

    def test_only_an_investment_account_takes_a_dividend(self):
        checking = self.account(type="spending")

        self.assert_rejected(self.dividend(checking, self.asset(), "5.00"), "account_id")

    def test_another_users_account_is_not_found(self):
        account = self.bourse()
        asset = self.asset()
        self.bought(account, asset, "2", "100")

        self.assertEqual(self.dividend(account, asset, "5.00", user=2).status_code, 404)

    def test_dividends_are_listed_with_the_other_operations(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")
        paid = self.paid(account, asset, "5.00", date="2026-04-01")

        listed = self.listed()["results"]

        self.assertEqual([item["type"] for item in listed], ["dividend", "buy"])
        self.assertEqual(listed[0]["asset"]["symbol"], "AAPL")
        self.assertEqual(self.read(paid).json()["cash_amount"], "5.00")

    def test_a_dividend_can_be_corrected_and_deleted(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")
        paid = self.paid(account, asset, "5.00", date="2026-04-01")

        response = self.correct(paid, account, asset, amount="6.00")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.balance(account), "806.00")
        self.assertEqual(self.removed(paid).status_code, 204)
        self.assertEqual(self.balance(account), "800.00")

    def test_deleting_the_purchase_a_dividend_needs_is_rejected_and_changes_nothing(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        purchase = self.bought(account, asset, "2", "100", date="2026-03-10")
        self.paid(account, asset, "5.00", date="2026-04-01")

        response = self.removed(purchase)

        self.assert_rejected(response, "form")
        self.assertIn("Dividendo del 1 abr 2026", response.json()["errors"]["form"][0])
        self.assertEqual(self.balance(account), "805.00")

    def test_a_sale_that_would_leave_a_dividend_without_units_is_rejected(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")
        self.paid(account, asset, "5.00", date="2026-04-01")

        response = self.trade("sell", account, asset, "2", "120", date="2026-03-20")

        self.assert_rejected(response, "units")
        self.assertEqual(self.balance(account), "805.00")

    def test_moving_a_dividend_before_the_purchase_is_rejected(self):
        account = self.bourse(opening_balance="1000.00")
        asset = self.asset()
        self.bought(account, asset, "2", "100", date="2026-03-10")
        paid = self.paid(account, asset, "5.00", date="2026-04-01")

        response = self.correct(paid, account, asset, date="2026-03-01")

        self.assert_rejected(response, "asset_id")
