import datetime
import threading
from unittest import mock

from django.db import connection
from django.test import TransactionTestCase, override_settings, tag

from expenses.tests import FOOD, TODAY, ExpenseApiTestCase
from investments import quotes
from investments.models import Asset


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

    def test_only_an_investment_account_takes_sales(self):
        account = self.account(type="spending")

        self.assert_rejected(self.trade("sell", account, self.asset(), "1", "10"), "account_id")


@tag("database")
@override_settings(INTERNAL_SERVICE_KEY="expected-key")
class ConcurrentSalesTests(TransactionTestCase):
    """Real commits on separate connections: the Account lock must queue the second sale."""

    def test_two_simultaneous_sales_cannot_sell_the_same_units(self):
        import json

        from django.test import Client

        headers = {"X-Okane-Service-Key": "expected-key", "X-Okane-User-Id": "1"}
        patcher = mock.patch("accounts.clock.today", return_value=TODAY)
        patcher.start()
        self.addCleanup(patcher.stop)

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
        sale = {
            "account_id": account["id"],
            "asset_id": asset.id,
            "units": "1",
            "unit_price": "10",
        }
        post("/api/investments/transactions/buy", {**sale, "units": "1"})

        statuses = []
        barrier = threading.Barrier(2)

        def sell():
            try:
                barrier.wait()
                statuses.append(post("/api/investments/transactions/sell", sale).status_code)
            finally:
                connection.close()

        threads = [threading.Thread(target=sell) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(sorted(statuses), [201, 400])


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
            {"value": "150.00000000", "source": "last_transaction", "date": "2026-11-10"},
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
