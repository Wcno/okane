from investments.tests import PerformanceTestCase


class SavingsProjectionTests(PerformanceTestCase):
    """The original read of one savings Account: GET with its scenario in the query."""

    def read(self, query, user=1):
        return self.call("GET", f"/api/savings/projection?{query}", user=user)

    def test_a_thousand_at_twelve_percent_for_a_month_with_a_closing_hundred_ends_in_1110(self):
        savings = self.account(type="savings")

        response = self.read(
            f"account_id={savings['id']}&months=1&monthly_contribution=100.00&annual_rate=0.12"
        )

        self.assertEqual(response.status_code, 200, response.content)
        scenario = response.json()["scenarios"][0]
        self.assertEqual(scenario["final_capital"], "1110.00")
        self.assertEqual(scenario["result"], "10.00")
        self.assertEqual(scenario["initial_capital"], "1000.00")
        self.assertEqual(response.json()["source"]["basis"], "balance")

    def test_omitted_values_start_from_the_balance_with_the_rate_saved_on_the_account(self):
        savings = self.account(type="savings", annual_interest_rate="0.12")

        scenario = self.read(f"account_id={savings['id']}").json()["scenarios"][0]

        self.assertEqual(scenario["months"], 12)
        self.assertEqual(scenario["monthly_contribution"], "0.00")
        self.assertEqual(scenario["annual_rate"], "0.120000")
        self.assertEqual(scenario["final_capital"], "1126.83")
        self.assertEqual(len(scenario["series"]), 12)

    def test_without_a_saved_rate_the_rate_is_zero(self):
        savings = self.account(type="savings")

        scenario = self.read(f"account_id={savings['id']}").json()["scenarios"][0]

        self.assertEqual(scenario["final_capital"], "1000.00")

    def test_another_users_account_and_an_unknown_one_are_not_found(self):
        theirs = self.account(user=2, type="savings")

        self.assertEqual(self.read(f"account_id={theirs['id']}").status_code, 404)
        self.assertEqual(self.read("account_id=99999").status_code, 404)

    def test_only_a_savings_account_is_read(self):
        broker = self.investment_account()
        spending = self.account(type="spending")

        self.assert_rejected(self.read(f"account_id={broker['id']}"), "account_id")
        self.assert_rejected(self.read(f"account_id={spending['id']}"), "account_id")
        self.assert_rejected(self.read(""), "account_id")

    def test_the_query_obeys_the_same_limits_as_a_scenario(self):
        savings = self.account(type="savings")
        base = f"account_id={savings['id']}"

        self.assert_rejected(self.read(f"{base}&months=0"), "months")
        self.assert_rejected(self.read(f"{base}&months=1.5"), "months")
        self.assert_rejected(self.read(f"{base}&annual_rate=-0.01"), "annual_rate")
        self.assert_rejected(self.read(f"{base}&monthly_contribution=-1"), "monthly_contribution")
        self.assert_rejected(self.read(f"{base}&initial_capital=-1"), "initial_capital")

    def test_a_negative_balance_asks_for_a_hypothetical_capital(self):
        savings = self.account(type="savings", opening_balance="-50.00")

        self.assert_rejected(self.read(f"account_id={savings['id']}"), "initial_capital")
        shown = self.read(f"account_id={savings['id']}&initial_capital=10.00")
        self.assertEqual(shown.status_code, 200)

    def test_reading_a_projection_changes_nothing_that_was_recorded(self):
        savings = self.account(type="savings", annual_interest_rate="0.0300")
        before = self.call("GET", "/api/accounts").json()

        self.read(f"account_id={savings['id']}&months=24&monthly_contribution=50")

        self.assertEqual(self.call("GET", "/api/accounts").json(), before)
