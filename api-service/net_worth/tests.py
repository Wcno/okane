from decimal import Decimal

from dashboard.tests import DashboardApiTestCase
from investments.tests import PerformanceTestCase

HISTORY = "/api/net-worth/history"


class NetWorthApiTestCase(PerformanceTestCase, DashboardApiTestCase):
    def history(self, user=1):
        response = self.call("GET", HISTORY, user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def dividend(self, account, asset, amount, user=1, **fields):
        body = {"account_id": account["id"], "asset_id": asset.id, "amount": amount, **fields}
        return self.call("POST", "/api/investments/transactions/dividend", body, user=user)

    def months(self, user=1):
        return {period["month"]: period for period in self.history(user)["periods"]}

    def assert_reconciles(self, period):
        change = Decimal(period["net_worth"]) - Decimal(period["opening_net_worth"])
        parts = (
            Decimal(period["opening_balances_added"])
            + Decimal(period["net_savings"])
            + Decimal(period["return"])
        )
        self.assertEqual(change, parts, period)

    def assert_every_month_reconciles(self, user=1):
        for period in self.history(user)["periods"]:
            self.assert_reconciles(period)


class DecompositionTests(NetWorthApiTestCase):
    def test_a_gain_month_and_a_loss_month_split_into_incorporation_savings_and_return(self):
        checking = self.account(opening_balance="1000.00", opening_date="2026-10-01")
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-10-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "50", date="2026-10-05")
        self.set_price(asset, "60", date="2026-10-31")
        self.income(checking, "200.00", date="2026-11-03")
        self.registered(checking, amount="50.00", date="2026-11-04")
        self.set_price(asset, "55", date="2026-11-10")

        months = self.months()

        october, november = months["2026-10"], months["2026-11"]
        self.assertEqual(october["opening_net_worth"], "0.00")
        self.assertEqual(october["opening_balances_added"], "2000.00")
        self.assertEqual(october["net_savings"], "0.00")
        self.assertEqual(october["return"], "100.00")
        self.assertEqual(october["net_worth"], "2100.00")
        self.assertEqual(november["opening_net_worth"], "2100.00")
        self.assertEqual(november["opening_balances_added"], "0.00")
        self.assertEqual(november["net_savings"], "150.00")
        self.assertEqual(november["return"], "-50.00")
        self.assertEqual(november["net_worth"], "2200.00")
        self.assert_every_month_reconciles()

    def test_the_period_declares_its_cuts_and_the_current_one_ends_today(self):
        self.account(opening_date="2026-10-01")

        months = self.months()

        self.assertEqual(months["2026-10"]["opening_cut"], "2026-09-30")
        self.assertEqual(months["2026-10"]["closing_cut"], "2026-10-31")
        self.assertEqual(months["2026-11"]["opening_cut"], "2026-10-31")
        self.assertEqual(months["2026-11"]["closing_cut"], "2026-11-16")
        self.assertEqual(self.history()["as_of"], "2026-11-16")

    def test_an_account_that_starts_mid_month_is_an_incorporation_and_not_savings_or_return(self):
        self.account(opening_balance="1000.00", opening_date="2026-10-01")
        self.account(name="Ahorro", type="savings", opening_balance="300.00", opening_date="2026-11-12")

        november = self.months()["2026-11"]

        self.assertEqual(november["opening_net_worth"], "1000.00")
        self.assertEqual(november["opening_balances_added"], "300.00")
        self.assertEqual(november["net_savings"], "0.00")
        self.assertEqual(november["return"], "0.00")
        self.assertEqual(november["net_worth"], "1300.00")

    def test_the_series_starts_in_the_month_of_the_first_account_even_before_first_use(self):
        checking = self.account(opening_balance="500.00", opening_date="2026-08-15")
        self.income(checking, "100.00", date="2026-08-20")

        months = self.months()

        self.assertEqual(list(months), ["2026-08", "2026-09", "2026-10", "2026-11"])
        self.assertEqual(months["2026-08"]["net_worth"], "600.00")
        self.assertEqual(months["2026-08"]["net_savings"], "100.00")
        self.assertEqual(months["2026-09"]["net_worth"], "600.00")

    def test_a_user_without_accounts_has_an_empty_series(self):
        self.assertEqual(self.history()["periods"], [])

    def test_a_user_sees_only_their_own_series(self):
        self.account(opening_balance="500.00", opening_date="2026-11-01", user=1)

        self.assertEqual(self.history(user=2)["periods"], [])

    def test_a_correction_to_a_past_record_changes_that_month_and_the_ones_after(self):
        checking = self.account(opening_balance="1000.00", opening_date="2026-10-01")
        expense = self.registered(checking, amount="40.00", date="2026-10-10")
        self.assertEqual(self.months()["2026-11"]["net_worth"], "960.00")

        response = self.call(
            "PUT",
            f"/api/expenses/{expense['id']}",
            {"account_id": checking["id"], "amount": "10.00", "category_id": expense["category_id"], "date": "2026-10-10"},
        )
        self.assertEqual(response.status_code, 200, response.content)

        months = self.months()
        self.assertEqual(months["2026-10"]["net_savings"], "-10.00")
        self.assertEqual(months["2026-11"]["opening_net_worth"], "990.00")
        self.assert_every_month_reconciles()

    def test_an_archived_account_keeps_its_contribution(self):
        checking = self.account(opening_balance="1000.00", opening_date="2026-10-01")
        self.registered(checking, amount="40.00", date="2026-10-10")
        before = self.months()

        self.archive(checking)

        self.assertEqual(self.months(), before)


class TransferTests(NetWorthApiTestCase):
    def test_a_transfer_does_not_change_the_net_worth_or_the_return(self):
        checking = self.account(opening_balance="1000.00", opening_date="2026-11-01")
        broker = self.investment_account(opening_balance="0.00", opening_date="2026-11-01")
        before = self.months()["2026-11"]

        self.transfer(checking, broker, "300.00", date="2026-11-08")

        after = self.months()["2026-11"]
        self.assertEqual(after["net_worth"], before["net_worth"])
        self.assertEqual(after["return"], "0.00")
        self.assertEqual(after["net_savings"], "0.00")
        self.assert_reconciles(after)

    def test_a_transfer_between_two_investment_accounts_cancels_in_the_portfolio(self):
        first = self.investment_account(name="Bróker A", opening_balance="500.00", opening_date="2026-11-01")
        second = self.investment_account(name="Bróker B", opening_balance="0.00", opening_date="2026-11-01")
        before = self.months()["2026-11"]

        self.transfer(first, second, "200.00", date="2026-11-08")

        after = self.months()["2026-11"]
        self.assertEqual(after["net_worth"], before["net_worth"])
        self.assertEqual(after["return"], "0.00")
        self.assert_reconciles(after)


class InvestmentIncomeTests(NetWorthApiTestCase):
    def test_commissions_lower_and_dividends_raise_the_return_of_the_period(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-11-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "50", date="2026-11-02", commission="5.00")
        self.set_price(asset, "50", date="2026-11-03")
        self.assertEqual(self.dividend(broker, asset, "20.00", date="2026-11-10").status_code, 201)

        november = self.months()["2026-11"]

        self.assertEqual(november["return"], "15.00")
        self.assertEqual(november["net_worth"], "1015.00")
        self.assert_reconciles(november)


class PriceTests(NetWorthApiTestCase):
    def test_a_missing_price_falls_back_to_the_last_transaction_and_is_flagged_as_an_estimate(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-10-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "50", date="2026-10-05")

        months = self.months()

        self.assertTrue(months["2026-10"]["estimated"])
        self.assertEqual(months["2026-10"]["net_worth"], "1000.00")
        self.assertNotEqual(months["2026-10"]["net_worth"], "500.00")

    def test_a_price_from_the_future_of_a_closing_is_never_used_and_a_known_price_clears_the_estimate(self):
        broker = self.investment_account(opening_balance="1000.00", opening_date="2026-10-01")
        asset = self.asset()
        self.bought(broker, asset, "10", "50", date="2026-10-05")
        self.set_price(asset, "80", date="2026-11-10")

        months = self.months()

        self.assertEqual(months["2026-10"]["net_worth"], "1000.00")
        self.assertTrue(months["2026-10"]["estimated"])
        self.assertEqual(months["2026-11"]["net_worth"], "1300.00")
        self.assertEqual(months["2026-11"]["return"], "300.00")
        self.assertFalse(months["2026-11"]["estimated"])  # its own close has a known price

        self.set_price(asset, "50", date="2026-10-31")
        months = self.months()
        self.assertFalse(months["2026-10"]["estimated"])
        self.assertFalse(months["2026-11"]["estimated"])


class PanelTests(NetWorthApiTestCase):
    def test_the_panel_net_worth_is_the_current_close_of_the_series(self):
        checking = self.account(opening_balance="1000.00", opening_date="2026-10-01")
        broker = self.investment_account(opening_balance="500.00", opening_date="2026-10-01")
        asset = self.asset()
        self.bought(broker, asset, "5", "40", date="2026-10-05")
        self.set_price(asset, "50", date="2026-11-02")
        self.income(checking, "100.00", date="2026-11-03")

        self.assertEqual(self.panel()["net_worth"], self.months()["2026-11"]["net_worth"])
        self.assertEqual(self.panel()["net_worth"], "1650.00")
