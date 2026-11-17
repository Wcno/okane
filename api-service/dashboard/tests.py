from decimal import Decimal

from budgets.tests import BudgetApiTestCase
from expenses.tests import FOOD, HOUSING

DASHBOARD = "/api/dashboard"


class DashboardApiTestCase(BudgetApiTestCase):
    def income(self, account, amount, user=1, date="2026-11-10"):
        body = {"account_id": account["id"], "amount": amount, "date": date}
        response = self.call("POST", "/api/incomes", body, user=user)
        self.assertEqual(response.status_code, 201, response.content)

    def panel(self, user=1):
        response = self.call("GET", DASHBOARD, user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()


class AvailableTests(DashboardApiTestCase):
    def test_a_new_user_has_nothing_and_no_division_by_zero(self):
        panel = self.panel()

        self.assertEqual(panel["accounts"], [])
        self.assertEqual(panel["available"], "0.00")
        self.assertEqual(panel["net_worth"], "0.00")
        self.assertEqual(panel["budgets"], [])
        self.assertEqual(panel["overdue"] + panel["upcoming"], [])

    def test_available_is_spending_balances_minus_what_spending_accounts_have_committed(self):
        checking = self.account(opening_balance="900.00")
        self.account(name="Tarjeta", opening_balance="-150.00")
        self.rule(checking, amount="200.00")

        panel = self.panel()

        self.assertEqual(panel["spending_balance"], "750.00")
        self.assertEqual(panel["committed"], "200.00")
        self.assertEqual(panel["available"], "550.00")

    def test_a_savings_payment_is_committed_but_does_not_lower_the_available(self):
        self.account(opening_balance="900.00")
        savings = self.account(name="Ahorro", type="savings", opening_balance="500.00")
        self.rule(savings, amount="50.00")

        panel = self.panel()

        self.assertEqual(panel["available"], "900.00")
        self.assertEqual(panel["committed"], "0.00")
        self.assertEqual(len(panel["upcoming"]), 1)
        self.assertEqual(panel["net_worth"], "1400.00")

    def test_an_expense_lowers_the_available_and_the_balance(self):
        checking = self.account()
        self.registered(checking, amount="40.00")

        panel = self.panel()

        self.assertEqual(panel["available"], "960.00")
        self.assertEqual(panel["accounts"][0]["balance"], "960.00")
        self.assertEqual(panel["expenses"], "40.00")

    def test_confirming_a_payment_for_another_amount_moves_the_available_once(self):
        checking = self.account()
        occurrence = self.pending_occurrence(checking, amount="100.00")
        self.assertEqual(self.panel()["available"], "900.00")

        for _ in range(2):
            self.confirm(occurrence, {"amount": "120.00", "account_id": checking["id"], "date": "2026-11-16"})

        panel = self.panel()
        self.assertEqual(panel["available"], "880.00")
        self.assertEqual(panel["committed"], "0.00")
        self.assertEqual(panel["upcoming"] + panel["overdue"], [])

    def test_cancelling_a_payment_releases_it_without_an_expense(self):
        checking = self.account()
        occurrence = self.pending_occurrence(checking, amount="100.00")

        self.cancel(occurrence)

        panel = self.panel()
        self.assertEqual(panel["available"], "1000.00")
        self.assertEqual(panel["expenses"], "0.00")


class PerDayTests(DashboardApiTestCase):
    def test_divides_by_the_days_left_in_the_month_today_included(self):
        self.account(opening_balance="1500.00")

        panel = self.panel()

        self.assertEqual(panel["days_left"], 15)
        self.assertEqual(panel["per_day"], "100.00")

    def test_the_last_day_divides_by_one(self):
        self.account(opening_balance="75.00")
        self.set_today("2026-11-30")

        panel = self.panel()

        self.assertEqual(panel["days_left"], 1)
        self.assertEqual(panel["per_day"], "75.00")

    def test_a_negative_available_stays_negative(self):
        checking = self.account(opening_balance="100.00")
        self.rule(checking, amount="400.00")

        panel = self.panel()

        self.assertEqual(panel["available"], "-300.00")
        self.assertEqual(panel["per_day"], "-20.00")


class RemainingTests(DashboardApiTestCase):
    def test_remaining_discounts_what_was_spent_and_what_is_committed(self):
        checking = self.account()
        self.budget(amount="300.00", category_id=FOOD)
        self.budget(amount="650.00", category_id=HOUSING)
        self.registered(checking, amount="40.00", category_id=FOOD)
        self.rule(checking, amount="100.00", category_id=FOOD)

        panel = self.panel()

        by_category = {row["category_id"]: row for row in panel["budgets"]}
        self.assertEqual(set(by_category), {FOOD, HOUSING})
        self.assertEqual(by_category[FOOD]["remaining"], "160.00")
        self.assertEqual(by_category[HOUSING]["remaining"], "650.00")

    def test_matches_the_budgets_query(self):
        checking = self.account()
        self.budget(amount="300.00", category_id=FOOD)
        self.registered(checking, amount="12.34", category_id=FOOD)
        self.rule(checking, amount="55.55", category_id=FOOD)

        panel = self.panel()

        self.assertEqual(panel["budgets"], [self.row(FOOD)])


class CarryOverTests(DashboardApiTestCase):
    def test_an_unresolved_payment_of_last_month_is_overdue_and_still_committed(self):
        checking = self.account(opening_date="2026-10-01")
        self.rule(checking, amount="100.00", day_of_month=20, start_date="2026-10-01")

        panel = self.panel()

        self.assertEqual(panel["available"], "800.00")
        self.assertEqual([item["due_date"] for item in panel["overdue"]], ["2026-10-20"])
        self.assertEqual([item["due_date"] for item in panel["upcoming"]], ["2026-11-20"])

    def test_this_months_payment_not_yet_due_is_upcoming(self):
        checking = self.account()
        self.rule(checking, amount="100.00", day_of_month=20)

        panel = self.panel()

        self.assertEqual([item["due_date"] for item in panel["upcoming"]], ["2026-11-20"])
        self.assertEqual(panel["overdue"], [])


class NetWorthTests(DashboardApiTestCase):
    def test_net_savings_is_the_months_incomes_minus_expenses(self):
        checking = self.account(opening_balance="1000.00", opening_date="2026-10-01")
        self.income(checking, "100.00")
        self.registered(checking, amount="30.00")
        self.registered(checking, amount="500.00", date="2026-10-20")

        panel = self.panel()

        self.assertEqual(panel["income"], "100.00")
        self.assertEqual(panel["expenses"], "30.00")
        self.assertEqual(panel["net_savings"], "70.00")
        self.assertEqual(panel["net_worth"], "570.00")

    def test_an_archived_account_keeps_its_balance_in_the_net_worth(self):
        checking = self.account(opening_balance="500.00")
        self.registered(checking, amount="0.01")
        self.archive(checking)
        self.account(name="Corriente", opening_balance="1000.00")

        panel = self.panel()

        self.assertEqual(Decimal(panel["net_worth"]), Decimal("1499.99"))
        self.assertEqual([account["archived"] for account in panel["accounts"]], [True, False])

    def test_an_archived_account_without_balance_is_left_out_of_the_list(self):
        checking = self.account(opening_balance="0.00")
        self.registered(checking, amount="5.00")
        self.income(checking, "5.00")
        self.archive(checking)

        self.assertEqual(self.panel()["accounts"], [])


class IsolationTests(DashboardApiTestCase):
    def test_two_users_see_only_their_own_figures(self):
        mine = self.account(user=1, opening_balance="1000.00")
        theirs = self.account(user=2, opening_balance="40.00")
        self.registered(mine, user=1, amount="10.00")
        self.registered(theirs, user=2, amount="4.00")
        self.rule(theirs, user=2, amount="6.00")
        self.budget(user=2, amount="100.00")

        first, second = self.panel(user=1), self.panel(user=2)

        self.assertEqual(first["available"], "990.00")
        self.assertEqual(first["budgets"], [])
        self.assertEqual(first["upcoming"], [])
        self.assertEqual(second["available"], "30.00")
        self.assertEqual(second["net_worth"], "36.00")
        self.assertEqual(len(second["upcoming"]), 1)

    def test_agrees_with_the_accounts_list(self):
        mine = self.account(opening_balance="1000.00")
        self.registered(mine, amount="33.33")

        panel = self.panel()

        self.assertEqual(panel["accounts"][0]["balance"], self.balance(mine))

    def test_needs_the_service_key(self):
        self.assertEqual(self.client.get(DASHBOARD).status_code, 403)
