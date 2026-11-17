from investments.tests import InvestmentApiTestCase


class MovementApiTestCase(InvestmentApiTestCase):
    def movements(self, query="", user=1):
        response = self.call("GET", f"/api/movements{query}", user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def keys(self, query="", user=1):
        return [(item["type"], item["id"]) for item in self.movements(query, user)["results"]]

    def income(self, account, user=1, **fields):
        body = {"amount": "40.00", "account_id": account["id"], **fields}
        response = self.call("POST", "/api/incomes", body, user=user)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def paid(self, account, asset, amount, user=1, **fields):
        body = {"account_id": account["id"], "asset_id": asset.id, "amount": amount, **fields}
        response = self.call("POST", "/api/investments/transactions/dividend", body, user=user)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def transferred(self, source, destination, user=1, **fields):
        body = {
            "amount": "25.00",
            "source_account_id": source["id"],
            "destination_account_id": destination["id"],
            **fields,
        }
        response = self.call("POST", "/api/transfers", body, user=user)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()


class ListMovementsTests(MovementApiTestCase):
    def test_the_six_types_are_listed_together_with_their_own_detail(self):
        spending = self.account(name="Corriente")
        savings = self.account(name="Ahorro", type="savings")
        broker = self.investment_account()
        asset = self.asset()
        self.transferred(spending, broker, date="2026-11-01")
        bought = self.bought(broker, asset, "2", "100", date="2026-11-02", commission="1.50")
        self.sold(broker, asset, "1", "110", date="2026-11-03")
        self.paid(broker, asset, "3.25", date="2026-11-04")
        income = self.income(spending, date="2026-11-05", description="Salario")
        expense = self.registered(savings, date="2026-11-06", amount="12.50")

        listed = self.movements()

        self.assertEqual(
            [item["type"] for item in listed["results"]],
            ["expense", "income", "dividend", "sell", "buy", "transfer"],
        )
        self.assertEqual(listed["total"], 6)
        by_type = {item["type"]: item for item in listed["results"]}
        self.assertEqual(by_type["expense"]["id"], expense["id"])
        self.assertEqual(by_type["expense"]["category_id"], expense["category_id"])
        self.assertEqual(by_type["income"]["description"], "Salario")
        self.assertEqual(by_type["income"]["id"], income["id"])
        self.assertEqual(by_type["buy"]["id"], bought["id"])
        self.assertEqual(by_type["buy"]["amount"], "200.00")
        self.assertEqual(by_type["buy"]["commission"], "1.50")
        self.assertEqual(by_type["buy"]["units"], "2.00000000")
        self.assertEqual(by_type["buy"]["unit_price"], "100.00000000")
        self.assertEqual(by_type["buy"]["asset"]["symbol"], "AAPL")
        self.assertEqual(by_type["dividend"]["amount"], "3.25")
        self.assertIsNone(by_type["dividend"]["units"])
        self.assertEqual(by_type["transfer"]["account_id"], spending["id"])
        self.assertEqual(by_type["transfer"]["destination_account_id"], broker["id"])

    def test_ids_shared_by_several_models_keep_their_type_and_a_stable_order(self):
        account = self.account()
        broker = self.investment_account()
        asset = self.asset()
        created = {
            "buy": self.bought(broker, asset, "1", "10", date="2026-11-10")["id"],
            "income": self.income(account, date="2026-11-10")["id"],
            "expense": self.registered(account, date="2026-11-10")["id"],
            "transfer": self.transferred(account, broker, date="2026-11-10")["id"],
        }

        keys = self.keys()

        self.assertEqual(keys, [(kind, created[kind]) for kind in ("buy", "expense", "income", "transfer")])
        self.assertEqual(self.keys(), keys)

    def test_the_same_day_lists_the_highest_id_of_a_type_first(self):
        account = self.account()
        first = self.registered(account, date="2026-11-10")
        second = self.registered(account, date="2026-11-10")

        self.assertEqual(self.keys(), [("expense", second["id"]), ("expense", first["id"])])

    def test_a_transfer_appears_once_and_matches_either_account(self):
        source = self.account(name="Origen")
        destination = self.account(name="Destino")
        other = self.account(name="Otra")
        transfer = self.transferred(source, destination)

        for account in (source, destination):
            self.assertEqual(self.keys(f"?account_id={account['id']}"), [("transfer", transfer["id"])])
        self.assertEqual(self.keys(f"?account_id={other['id']}"), [])
        self.assertEqual(self.movements()["total"], 1)

    def test_filters_combine_by_type_account_and_inclusive_period(self):
        first = self.account(name="Primera")
        second = self.account(name="Segunda")
        self.registered(first, date="2026-11-01")
        inside = self.registered(first, date="2026-11-05")
        self.registered(first, date="2026-11-10")
        self.registered(second, date="2026-11-05")
        self.income(first, date="2026-11-05")

        keys = self.keys(f"?type=expense&account_id={first['id']}&from=2026-11-05&to=2026-11-05")

        self.assertEqual(keys, [("expense", inside["id"])])
        self.assertEqual(len(self.keys("?type=expense&type=income&from=2026-11-05&to=2026-11-10")), 4)

    def test_pages_keep_the_order_without_repeating_or_losing_a_record(self):
        account = self.account()
        broker = self.investment_account()
        asset = self.asset()
        for day in range(1, 5):
            self.registered(account, date=f"2026-11-0{day}")
            self.income(account, date=f"2026-11-0{day}")
        self.bought(broker, asset, "1", "10", date="2026-11-04")
        everything = self.keys("?page_size=200")

        first = self.movements("?page_size=4")
        second = self.movements("?page_size=4&page=2")
        third = self.movements("?page_size=4&page=3")

        self.assertEqual(first["total"], 9)
        self.assertEqual(first["next_page"], 2)
        self.assertIsNone(third["next_page"])
        paged = [(item["type"], item["id"]) for page in (first, second, third) for item in page["results"]]
        self.assertEqual(paged, everything)
        self.assertEqual(len(set(paged)), 9)

    def test_money_stays_an_exact_decimal_string(self):
        account = self.account()
        self.registered(account, amount="0.10")
        self.income(account, amount="999999999999.99")

        amounts = {item["type"]: item["amount"] for item in self.movements()["results"]}

        self.assertEqual(amounts, {"expense": "0.10", "income": "999999999999.99"})

    def test_a_pending_reservation_is_not_an_expense(self):
        self.account()

        self.assertEqual(self.movements()["results"], [])


class MovementIsolationTests(MovementApiTestCase):
    def test_a_user_sees_only_their_own_records(self):
        mine = self.account()
        theirs = self.account(user=2)
        own = self.registered(mine)
        self.registered(theirs, user=2)

        self.assertEqual(self.keys(), [("expense", own["id"])])
        self.assertEqual(len(self.keys(user=2)), 1)

    def test_an_account_of_another_user_or_an_unknown_one_is_not_found(self):
        theirs = self.account(user=2)

        for account_id in (theirs["id"], 9999):
            response = self.call("GET", f"/api/movements?account_id={account_id}")
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json(), {"detail": "not_found"})

    def test_an_archived_account_still_filters(self):
        account = self.account()
        record = self.registered(account)
        self.archive(account)

        self.assertEqual(self.keys(f"?account_id={account['id']}"), [("expense", record["id"])])

    def test_a_bad_filter_is_a_validation_error_on_its_field(self):
        for query, field in (
            ("?type=gift", "type"),
            ("?account_id=abc", "account_id"),
            ("?from=2026-13-01", "from"),
            ("?to=yesterday", "to"),
            ("?from=2026-11-10&to=2026-11-01", "to"),
            ("?page=2", "page"),
        ):
            response = self.call("GET", f"/api/movements{query}")
            self.assertEqual(response.status_code, 400, query)
            self.assertEqual(list(response.json()["errors"]), [field], query)
