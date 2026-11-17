from investments.tests import PerformanceTestCase


class ProjectionTests(PerformanceTestCase):
    def scenario(self, **fields):
        return {
            "initial_capital": "1000.00",
            "monthly_contribution": "100.00",
            "months": 1,
            "annual_rate": "0.12",
            **fields,
        }

    def project(self, selection, *scenarios, user=1):
        return self.call(
            "POST",
            "/api/investments/projection",
            {"selection": selection, "scenarios": list(scenarios)},
            user=user,
        )

    def projected(self, selection, *scenarios, user=1):
        response = self.project(selection, *scenarios, user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def account_selection(self, account):
        return {"kind": "account", "account_id": account["id"]}

    def test_one_month_at_twelve_percent_with_a_closing_contribution_ends_in_1110(self):
        savings = self.account(type="savings")

        body = self.projected(self.account_selection(savings), self.scenario())

        scenario = body["scenarios"][0]
        self.assertEqual(scenario["final_capital"], "1110.00")
        self.assertEqual(scenario["contributed"], "1100.00")
        self.assertEqual(scenario["result"], "10.00")
        self.assertEqual(
            body["convention"],
            {"monthly_rate": "annual_rate_divided_by_12", "contribution": "end_of_month"},
        )

    def test_without_a_rate_the_capital_only_grows_by_what_is_contributed(self):
        savings = self.account(type="savings")

        body = self.projected(self.account_selection(savings), self.scenario(annual_rate="0"))

        self.assertEqual(body["scenarios"][0]["final_capital"], "1100.00")
        self.assertEqual(body["scenarios"][0]["result"], "0.00")

    def test_an_investment_at_minus_twelve_percent_loses_ten_on_the_first_month(self):
        broker = self.investment_account()

        body = self.projected(self.account_selection(broker), self.scenario(annual_rate="-0.12"))

        scenario = body["scenarios"][0]
        self.assertEqual(scenario["final_capital"], "1090.00")
        self.assertEqual(scenario["contributed"], "1100.00")
        self.assertEqual(scenario["result"], "-10.00")

    def test_the_monthly_series_rounds_each_row_from_the_exact_capital(self):
        savings = self.account(type="savings")

        body = self.projected(
            self.account_selection(savings),
            self.scenario(
                initial_capital="100.00", monthly_contribution="0.00", months=3, annual_rate="0.10"
            ),
        )

        series = body["scenarios"][0]["series"]
        # The exact capitals are 100.8333.., 101.6736.. and 102.5210..
        self.assertEqual([row["capital"] for row in series], ["100.83", "101.67", "102.52"])
        self.assertEqual([row["month"] for row in series], [1, 2, 3])
        self.assertEqual(series[-1]["capital"], body["scenarios"][0]["final_capital"])

    def test_the_initial_capital_defaults_to_the_selection(self):
        savings = self.account(type="savings", opening_balance="2500.00")

        body = self.projected(
            self.account_selection(savings), self.scenario(initial_capital=None, annual_rate="0")
        )

        self.assertEqual(body["scenarios"][0]["initial_capital"], "2500.00")
        self.assertEqual(body["source"]["value"], "2500.00")
        self.assertEqual(body["source"]["basis"], "balance")
        self.assertEqual(body["source"]["as_of"], "2026-11-16")

    def test_an_investment_starts_from_cash_plus_positions_and_flags_estimated_prices(self):
        broker = self.investment_account(opening_balance="1000.00")
        asset = self.asset()
        self.bought(broker, asset, "2", "100")
        self.assertEqual(self.set_price(asset, "150").status_code, 200)

        manual = self.projected(self.account_selection(broker), self.scenario(initial_capital=None))
        self.assertEqual(manual["source"]["value"], "1100.00")
        self.assertEqual(manual["source"]["basis"], "valuation")
        self.assertFalse(manual["source"]["estimated"])

        other = self.investment_account(name="Otro", opening_balance="0.00")
        self.bought(other, self.asset("MSFT", name="Microsoft"), "1", "50")
        estimated = self.projected(
            self.account_selection(other), self.scenario(initial_capital=None)
        )
        self.assertTrue(estimated["source"]["estimated"])

    def test_the_portfolio_adds_its_investment_accounts_without_duplicating_internal_contributions(
        self,
    ):
        first = self.investment_account(name="Uno", opening_balance="1000.00")
        second = self.investment_account(name="Dos", opening_balance="500.00")
        self.transfer(first, second, "200.00")
        self.account(type="savings", opening_balance="9999.00")

        body = self.projected({"kind": "portfolio"}, self.scenario(initial_capital=None))

        self.assertEqual(body["source"]["value"], "1500.00")

    def test_the_saved_rate_is_offered_but_never_applied_by_itself(self):
        savings = self.account(type="savings", annual_interest_rate="0.0425")

        body = self.projected(self.account_selection(savings), self.scenario(annual_rate="0"))

        self.assertEqual(body["source"]["saved_annual_rate"], "0.042500")
        self.assertEqual(body["scenarios"][0]["annual_rate"], "0.000000")

    def test_up_to_three_scenarios_are_compared_in_order(self):
        savings = self.account(type="savings")

        body = self.projected(
            self.account_selection(savings),
            self.scenario(annual_rate="0"),
            self.scenario(annual_rate="0.12"),
            self.scenario(annual_rate="0.24"),
        )

        self.assertEqual(
            [item["final_capital"] for item in body["scenarios"]], ["1100.00", "1110.00", "1120.00"]
        )

    def test_a_fourth_scenario_or_none_is_rejected(self):
        savings = self.account(type="savings")
        selection = self.account_selection(savings)

        self.assert_rejected(self.project(selection, *[self.scenario()] * 4), "scenarios")
        self.assert_rejected(self.project(selection), "scenarios")

    def test_another_users_account_is_as_absent_as_an_unknown_one(self):
        theirs = self.account(user=2, type="savings")

        response = self.project(self.account_selection(theirs), self.scenario())
        unknown = self.project({"kind": "account", "account_id": 99999}, self.scenario())

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content, unknown.content)

    def test_a_spending_account_is_not_projected(self):
        spending = self.account(type="spending")

        self.assert_rejected(
            self.project(self.account_selection(spending), self.scenario()), "selection"
        )

    def test_a_negative_hypothetical_capital_or_contribution_is_rejected(self):
        savings = self.account(type="savings")
        selection = self.account_selection(savings)

        negative_capital = self.project(selection, self.scenario(initial_capital="-1.00"))
        negative_contribution = self.project(selection, self.scenario(monthly_contribution="-1.00"))

        self.assertIn("scenarios", negative_capital.json()["errors"])
        self.assertEqual(negative_capital.status_code, 400)
        self.assertEqual(negative_contribution.status_code, 400)

    def test_a_negative_valuation_asks_for_a_hypothetical_capital_instead_of_using_it(self):
        savings = self.account(type="savings", opening_balance="-50.00")
        selection = self.account_selection(savings)

        response = self.project(selection, self.scenario(initial_capital=None))

        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("scenarios.0.initial_capital", response.json()["errors"])
        shown = self.projected(selection, self.scenario(initial_capital="10.00"))
        self.assertEqual(shown["source"]["value"], "-50.00")

    def test_the_term_must_be_a_positive_whole_number_of_months(self):
        savings = self.account(type="savings")
        selection = self.account_selection(savings)

        for months in (0, -1, 1.5, "12", True, 601):
            with self.subTest(months=months):
                response = self.project(selection, self.scenario(months=months))
                self.assertEqual(response.status_code, 400, response.content)

    def test_savings_take_no_negative_rate_and_investments_stop_at_minus_twelve_hundred_percent(
        self,
    ):
        savings = self.account(type="savings")
        broker = self.investment_account()

        negative = self.project(self.account_selection(savings), self.scenario(annual_rate="-0.01"))
        self.assertIn("scenarios.0.annual_rate", negative.json()["errors"])
        edge = self.project(self.account_selection(broker), self.scenario(annual_rate="-12"))
        self.assertIn("scenarios.0.annual_rate", edge.json()["errors"])
        near = self.projected(self.account_selection(broker), self.scenario(annual_rate="-11.99"))
        self.assertEqual(near["scenarios"][0]["final_capital"], "100.83")

    def test_a_projection_changes_nothing_that_was_recorded(self):
        savings = self.account(type="savings", annual_interest_rate="0.0300")
        before = self.call("GET", "/api/accounts").json()

        self.projected(self.account_selection(savings), self.scenario())

        self.assertEqual(self.call("GET", "/api/accounts").json(), before)
