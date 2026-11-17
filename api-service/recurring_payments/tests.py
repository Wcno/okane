import datetime
from decimal import Decimal
from unittest import mock

from django.test import tag

from expenses import tests as expense_tests
from expenses.models import Expense
from recurring_payments import reservations
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence

RULES = "/api/recurring-payments"


def day(text):
    return datetime.date.fromisoformat(text)


@tag("database")
class RecurringPaymentApiTestCase(expense_tests.ExpenseApiTestCase):
    def setUp(self):
        super().setUp()
        patcher = mock.patch("accounts.clock.today", return_value=expense_tests.TODAY)
        self.clock = patcher.start()
        self.addCleanup(patcher.stop)

    def set_today(self, text):
        self.clock.return_value = day(text)

    def create_rule(self, account, user=1, **fields):
        body = {
            "amount": "100.00",
            "category_id": self.initial_category("utilities", user=user),
            "account_id": account["id"],
            "day_of_month": 20,
            "start_date": "2026-11-01",
            **fields,
        }
        return self.call("POST", RULES, body, user=user)

    def rule(self, account, user=1, **fields):
        response = self.create_rule(account, user=user, **fields)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def rules(self, user=1):
        response = self.call("GET", RULES, user=user)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def occurrences(self, user=1):
        return [item for rule in self.rules(user) for item in rule["occurrences"]]

    def pending_occurrence(self, account, **fields):
        return self.rule(account, **fields)["occurrences"][0]

    def confirm(self, occurrence, data=None, user=1):
        return self.call("POST", f"{RULES}/occurrences/{occurrence['id']}/confirm", data, user=user)

    def cancel(self, occurrence, user=1):
        return self.call("POST", f"{RULES}/occurrences/{occurrence['id']}/cancel", user=user)

    def committed(self, month, user=1):
        return sum(
            (item.amount for item in reservations.committed(user, day(month))), Decimal("0")
        )


class CreateRuleTests(RecurringPaymentApiTestCase):
    def test_creates_a_rule_and_reserves_this_months_occurrence(self):
        account = self.account()

        created = self.rule(account, description="Internet")

        occurrence = created["occurrences"][0]
        self.assertEqual(
            {key: value for key, value in created.items() if key != "occurrences"},
            {
                "id": created["id"],
                "description": "Internet",
                "amount": "100.00",
                "account_id": account["id"],
                "category_id": self.UTILITIES,
                "day_of_month": 20,
                "start_date": "2026-11-01",
                "status": "active",
            },
        )
        self.assertEqual(len(created["occurrences"]), 1)
        self.assertEqual(occurrence["recurring_payment_id"], created["id"])
        self.assertEqual(occurrence["due_date"], "2026-11-20")
        self.assertEqual(occurrence["status"], "pending")
        self.assertEqual(occurrence["amount"], "100.00")
        self.assertIsNone(occurrence["entered_on"])
        self.assertIsNone(occurrence["expense_id"])

    def test_a_reservation_creates_no_expense_and_leaves_the_balance(self):
        account = self.account()

        self.rule(account)
        self.rules()

        self.assertEqual(Expense.objects.count(), 0)
        self.assertEqual(self.balance(account), "1000.00")

    def test_accepts_a_savings_account(self):
        savings = self.account(type="savings")

        self.assertEqual(self.create_rule(savings).status_code, 201)

    def test_rejects_invalid_fields(self):
        account = self.account()

        self.assert_rejected(self.create_rule(account, amount="0"), "amount")
        self.assert_rejected(self.create_rule(account, amount="12.345"), "amount")
        self.assert_rejected(self.create_rule(account, category_id=99), "category_id")
        self.assert_rejected(self.create_rule(account, day_of_month=32), "day_of_month")
        self.assert_rejected(self.create_rule(account, day_of_month=0), "day_of_month")
        self.assert_rejected(self.create_rule(account, day_of_month="5"), "day_of_month")
        self.assert_rejected(self.create_rule(account, start_date="mañana"), "start_date")
        self.assert_rejected(self.create_rule(account, description="x" * 141), "description")
        self.assertEqual(RecurringPayment.objects.count(), 0)

    def test_rejects_an_investment_or_archived_account(self):
        investment = self.account(type="investment")
        archived = self.account()
        self.registered(archived)
        self.archive(archived)

        self.assert_rejected(self.create_rule(investment), "account_id")
        self.assert_rejected(self.create_rule(archived), "account_id")

    def test_another_users_account_is_not_found(self):
        foreign = self.account(user=2)

        self.assertEqual(self.create_rule(foreign).status_code, 404)

    def test_a_start_after_the_day_skips_that_month(self):
        account = self.account()

        created = self.rule(account, start_date="2026-11-25", day_of_month=20)

        self.assertEqual(created["occurrences"], [])
        self.set_today("2026-12-01")
        self.assertEqual([item["due_date"] for item in self.occurrences()], ["2026-12-20"])

    def test_a_reservation_enters_at_the_rules_start_when_it_is_later(self):
        account = self.account()

        created = self.rule(account, start_date="2026-11-10", day_of_month=20)

        self.assertEqual(
            created["occurrences"][0]["reserved_from"], "2026-11-10"
        )


class MaterializationTests(RecurringPaymentApiTestCase):
    def test_day_31_becomes_the_last_day_of_shorter_months(self):
        account = self.account(opening_date="2026-01-01")
        self.set_today("2026-03-10")

        self.rule(account, start_date="2026-01-01", day_of_month=31)

        self.assertEqual(
            sorted(item["due_date"] for item in self.occurrences()),
            ["2026-01-31", "2026-02-28", "2026-03-31"],
        )

    def test_recovers_months_without_use_but_not_those_before_the_start(self):
        account = self.account(opening_date="2026-08-01")
        self.set_today("2026-08-12")
        self.rule(account, start_date="2026-08-10", day_of_month=5)

        self.set_today("2026-11-16")

        self.assertEqual(
            sorted(item["due_date"] for item in self.occurrences()),
            ["2026-09-05", "2026-10-05", "2026-11-05"],
        )

    def test_overdue_pending_occurrences_stay_visible_with_their_status(self):
        account = self.account(opening_date="2026-08-01")
        self.set_today("2026-09-01")
        self.rule(account, start_date="2026-09-01", day_of_month=5)

        self.set_today("2026-11-16")

        statuses = {item["due_date"]: item["status"] for item in self.occurrences()}
        self.assertEqual(
            statuses,
            {"2026-09-05": "overdue", "2026-10-05": "overdue", "2026-11-05": "overdue"},
        )

    def test_repeated_and_concurrent_materialization_creates_each_month_once(self):
        account = self.account()
        rule = self.rule(account)
        self.rules()
        # A concurrent request that read the rule before the marker moved.
        RecurringPayment.objects.filter(pk=rule["id"]).update(materialized_through=None)

        reservations.materialize(1)
        reservations.materialize(1)

        self.assertEqual(RecurringPaymentOccurrence.objects.count(), 1)

    def test_a_confirmed_month_is_not_recreated(self):
        account = self.account()
        occurrence = self.pending_occurrence(account)
        self.confirm(occurrence)

        self.rules()

        self.assertEqual(RecurringPaymentOccurrence.objects.count(), 1)

    def test_the_list_embeds_pending_and_this_months_only(self):
        account = self.account(opening_date="2026-08-01")
        self.set_today("2026-09-01")
        self.rule(account, start_date="2026-09-01", day_of_month=5)
        self.set_today("2026-11-16")
        september = next(item for item in self.occurrences() if item["due_date"] == "2026-09-05")
        self.cancel(september)

        due_dates = [item["due_date"] for item in self.occurrences()]

        self.assertEqual(due_dates, ["2026-11-05", "2026-10-05"])

    def test_paginates_the_rules(self):
        account = self.account()
        for _ in range(3):
            self.rule(account)

        page = self.call("GET", f"{RULES}?page_size=2").json()

        self.assertEqual(len(page["results"]), 2)
        self.assertEqual((page["total"], page["next_page"]), (3, 2))


class ReadOneTests(RecurringPaymentApiTestCase):
    def test_reads_a_rule_and_an_occurrence(self):
        account = self.account()
        created = self.rule(account)
        occurrence = created["occurrences"][0]

        rule_response = self.call("GET", f"{RULES}/{created['id']}")
        occurrence_response = self.call("GET", f"{RULES}/occurrences/{occurrence['id']}")

        self.assertEqual(rule_response.json(), created)
        self.assertEqual(occurrence_response.json(), occurrence)

    def test_another_users_ids_are_not_found(self):
        account = self.account()
        created = self.rule(account)
        occurrence = created["occurrences"][0]

        self.assertEqual(self.call("GET", f"{RULES}/{created['id']}", user=2).status_code, 404)
        self.assertEqual(
            self.call("GET", f"{RULES}/occurrences/{occurrence['id']}", user=2).status_code, 404
        )
        self.assertEqual(self.confirm(occurrence, user=2).status_code, 404)
        self.assertEqual(self.cancel(occurrence, user=2).status_code, 404)
        self.assertEqual(
            self.call("PUT", f"{RULES}/{created['id']}", {}, user=2).status_code, 404
        )
        self.assertEqual(self.call("DELETE", f"{RULES}/{created['id']}", user=2).status_code, 404)
        self.assertEqual(self.rules(user=2), [])

    def test_an_unknown_id_is_not_found(self):
        self.assertEqual(self.call("GET", f"{RULES}/999").status_code, 404)
        self.assertEqual(self.call("GET", f"{RULES}/occurrences/999").status_code, 404)


class ConfirmTests(RecurringPaymentApiTestCase):
    def test_confirming_creates_one_expense_and_frees_the_reservation(self):
        account = self.account()
        occurrence = self.pending_occurrence(account, amount="100.00")
        self.assertEqual(self.committed("2026-11-01"), Decimal("100.00"))

        first = self.confirm(
            occurrence,
            {"amount": "120.00", "account_id": account["id"], "date": "2026-11-16"},
        )
        second = self.confirm(
            occurrence,
            {"amount": "120.00", "account_id": account["id"], "date": "2026-11-16"},
        )

        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(second.json(), first.json())
        confirmed = first.json()
        self.assertEqual(confirmed["status"], "confirmed")
        self.assertEqual(confirmed["entered_on"], "2026-11-16")
        self.assertEqual(Expense.objects.count(), 1)
        expense = Expense.objects.get()
        self.assertEqual(confirmed["expense_id"], expense.id)
        self.assertEqual((expense.amount, expense.category_id), (Decimal("120.00"), self.UTILITIES))
        self.assertEqual(self.balance(account), "880.00")
        self.assertEqual(self.committed("2026-11-01"), Decimal("0"))

    def test_the_expense_json_names_the_occurrence_it_came_from(self):
        account = self.account()
        occurrence = self.pending_occurrence(account, amount="100.00")
        plain = self.call(
            "POST",
            "/api/expenses",
            {"amount": "5.00", "category_id": self.FOOD, "account_id": account["id"]},
        ).json()
        self.assertIsNone(plain["recurring_payment_occurrence_id"])
        self.confirm(occurrence, {"amount": "120.00", "account_id": account["id"]})
        expense_id = Expense.objects.get(amount=Decimal("120.00")).id

        detail = self.call("GET", f"/api/expenses/{expense_id}").json()
        listed = {
            item["id"]: item for item in self.call("GET", "/api/expenses").json()["results"]
        }
        replaced = self.call(
            "PUT",
            f"/api/expenses/{expense_id}",
            {
                "amount": "130.00",
                "category_id": self.UTILITIES,
                "account_id": account["id"],
                "date": detail["date"],
            },
        ).json()

        self.assertEqual(detail["recurring_payment_occurrence_id"], occurrence["id"])
        self.assertEqual(listed[expense_id]["recurring_payment_occurrence_id"], occurrence["id"])
        self.assertIsNone(listed[plain["id"]]["recurring_payment_occurrence_id"])
        self.assertEqual(replaced["recurring_payment_occurrence_id"], occurrence["id"])

    def test_the_origin_is_read_only_and_survives_editing_the_expense(self):
        account = self.account()
        occurrence = self.pending_occurrence(account, amount="100.00")
        self.confirm(occurrence)
        expense_id = Expense.objects.get().id

        self.call(
            "PUT",
            f"/api/expenses/{expense_id}",
            {
                "amount": "90.00",
                "category_id": self.FOOD,
                "account_id": account["id"],
                "date": "2026-11-16",
                "recurring_payment_occurrence_id": None,
            },
        )

        self.assertEqual(
            self.call("GET", f"/api/expenses/{expense_id}").json()["recurring_payment_occurrence_id"],
            occurrence["id"],
        )
        self.assertEqual(self.occurrences()[0]["status"], "confirmed")

    def test_the_proposed_values_are_the_reserved_ones_and_today(self):
        account = self.account()
        occurrence = self.pending_occurrence(account, amount="100.00", description="Internet")

        response = self.confirm(occurrence)

        self.assertEqual(response.status_code, 200, response.content)
        expense = Expense.objects.get()
        self.assertEqual(
            (expense.amount, expense.account_id, expense.date, expense.description),
            (Decimal("100.00"), account["id"], expense_tests.TODAY, "Internet"),
        )

    def test_the_expense_can_come_from_another_account(self):
        reserved = self.account()
        savings = self.account(type="savings", name="Ahorro", opening_balance="500.00")
        occurrence = self.pending_occurrence(reserved)

        self.confirm(occurrence, {"account_id": savings["id"]})

        self.assertEqual(self.balance(savings), "400.00")
        self.assertEqual(self.balance(reserved), "1000.00")

    def test_a_repeat_with_other_data_conflicts_without_a_second_expense(self):
        account = self.account()
        occurrence = self.pending_occurrence(account)
        self.confirm(occurrence, {"amount": "120.00"})

        response = self.confirm(occurrence, {"amount": "130.00"})

        self.assertEqual(response.status_code, 409)
        self.assertTrue(response.json()["errors"]["form"][0])
        self.assertEqual(Expense.objects.count(), 1)

    def test_a_repeat_without_a_body_returns_the_original_result(self):
        account = self.account()
        occurrence = self.pending_occurrence(account)
        first = self.confirm(occurrence, {"amount": "120.00", "date": "2026-11-15"})
        self.set_today("2026-11-17")

        again = self.confirm(occurrence)

        self.assertEqual(again.json(), first.json())

    def test_rejects_invalid_confirmations_without_resolving(self):
        account = self.account()
        occurrence = self.pending_occurrence(account, start_date="2026-11-05")

        self.assert_rejected(self.confirm(occurrence, {"amount": "0"}), "amount")
        self.assert_rejected(self.confirm(occurrence, {"date": "2026-11-17"}), "date")
        self.assert_rejected(self.confirm(occurrence, {"date": "2026-11-04"}), "date")
        self.assertEqual(self.confirm(occurrence, {"account_id": 99999}).status_code, 404)
        investment = self.account(type="investment")
        self.assert_rejected(self.confirm(occurrence, {"account_id": investment["id"]}), "account_id")
        self.assertEqual(Expense.objects.count(), 0)
        self.assertEqual(self.occurrences()[0]["status"], "pending")

    def test_a_date_before_the_account_started_is_rejected(self):
        account = self.account(opening_date="2026-11-10")
        occurrence = self.pending_occurrence(account, start_date="2026-11-01")

        self.assert_rejected(self.confirm(occurrence, {"date": "2026-11-05"}), "date")

    def test_a_negative_balance_does_not_block_the_expense(self):
        account = self.account(opening_balance="50.00")
        occurrence = self.pending_occurrence(account, amount="100.00")

        self.assertEqual(self.confirm(occurrence).status_code, 200)
        self.assertEqual(self.balance(account), "-50.00")

    def test_editing_or_deleting_the_expense_does_not_reopen_the_reservation(self):
        account = self.account()
        occurrence = self.pending_occurrence(account)
        confirmed = self.confirm(occurrence).json()
        expense_url = f"/api/expenses/{confirmed['expense_id']}"

        edited = self.call(
            "PUT",
            expense_url,
            {
                "amount": "90.00",
                "category_id": self.FOOD,
                "account_id": account["id"],
                "date": "2026-11-16",
            },
        )
        deleted = self.call("DELETE", expense_url)

        self.assertEqual((edited.status_code, deleted.status_code), (200, 204))
        after = self.occurrences()[0]
        self.assertEqual(after["status"], "confirmed")
        self.assertEqual(after["expense_id"], confirmed["expense_id"])
        self.assertEqual(self.committed("2026-11-01"), Decimal("0"))


class CancelTests(RecurringPaymentApiTestCase):
    def test_cancelling_frees_the_reservation_without_an_expense(self):
        account = self.account()
        occurrence = self.pending_occurrence(account)

        response = self.cancel(occurrence)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["status"], "cancelled")
        self.assertEqual(response.json()["resolved_on"], "2026-11-16")
        self.assertIsNone(response.json()["entered_on"])
        self.assertEqual(Expense.objects.count(), 0)
        self.assertEqual(self.balance(account), "1000.00")
        self.assertEqual(self.committed("2026-11-01"), Decimal("0"))

    def test_cancelling_again_is_idempotent(self):
        account = self.account()
        occurrence = self.pending_occurrence(account)
        first = self.cancel(occurrence).json()
        self.set_today("2026-11-18")

        again = self.cancel(occurrence)

        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json(), first)

    def test_resolutions_are_exclusive(self):
        account = self.account()
        cancelled = self.pending_occurrence(account)
        confirmed = self.pending_occurrence(account, start_date="2026-11-02")
        self.cancel(cancelled)
        self.confirm(confirmed)

        self.assertEqual(self.confirm(cancelled).status_code, 409)
        self.assertEqual(self.cancel(confirmed).status_code, 409)
        self.assertEqual(Expense.objects.count(), 1)

    def test_a_confirmation_that_loses_the_race_to_a_cancel_conflicts(self):
        account = self.account()
        occurrence = self.pending_occurrence(account)
        # The lock on the occurrence row serializes both calls; the second sees the first.
        self.cancel(occurrence)

        self.assertEqual(self.confirm(occurrence).status_code, 409)
        self.assertEqual(Expense.objects.count(), 0)


class CommittedAtACutoffTests(RecurringPaymentApiTestCase):
    def test_a_pending_occurrence_carries_over_until_it_is_resolved(self):
        account = self.account(opening_date="2026-10-01")
        self.set_today("2026-10-10")
        self.rule(account, start_date="2026-10-01", day_of_month=15)
        self.set_today("2026-11-16")
        self.rules()

        # October's reservation is still committed in November, counted once beside November's.
        self.assertEqual(self.committed("2026-10-01"), Decimal("100.00"))
        self.assertEqual(self.committed("2026-11-01"), Decimal("200.00"))

    def test_paying_in_december_keeps_the_november_cutoff(self):
        account = self.account(opening_date="2026-11-01")
        self.rule(account, start_date="2026-11-01", day_of_month=20)
        self.set_today("2026-12-05")
        november = next(item for item in self.occurrences() if item["due_date"] == "2026-11-20")

        confirmed = self.confirm(november, {"date": "2026-12-05"}).json()

        self.assertEqual(confirmed["entered_on"], "2026-12-05")
        self.assertEqual(Expense.objects.get().date, day("2026-12-05"))
        self.assertEqual(self.committed("2026-11-01"), Decimal("100.00"))
        self.assertEqual(self.committed("2026-12-01"), Decimal("100.00"))
        december = next(item for item in self.occurrences() if item["due_date"] == "2026-12-20")
        self.cancel(december)
        self.assertEqual(self.committed("2026-12-01"), Decimal("0"))

    def test_a_retroactive_confirmation_changes_the_period_it_names(self):
        account = self.account(opening_date="2026-10-01")
        self.set_today("2026-10-10")
        october = self.pending_occurrence(account, start_date="2026-10-01", day_of_month=15)
        self.set_today("2026-11-16")

        self.confirm(october, {"date": "2026-10-20"})
        self.rules()

        self.assertEqual(self.committed("2026-10-01"), Decimal("0"))
        self.assertEqual(self.committed("2026-11-01"), Decimal("100.00"))

    def test_history_uses_the_reservation_not_the_current_rule(self):
        account = self.account(opening_date="2026-10-01")
        self.set_today("2026-10-10")
        rule = self.rule(account, start_date="2026-10-01", day_of_month=15)
        self.set_today("2026-11-16")
        self.call(
            "PUT",
            f"{RULES}/{rule['id']}",
            {
                "amount": "999.00",
                "category_id": self.FOOD,
                "account_id": account["id"],
                "day_of_month": 28,
                "start_date": "2026-10-01",
            },
        )

        self.assertEqual(self.committed("2026-10-01"), Decimal("100.00"))
        self.assertEqual(
            sorted(item.amount for item in reservations.committed(1, day("2026-11-01"))),
            [Decimal("100.00"), Decimal("100.00")],
        )

    def test_other_users_reservations_do_not_count(self):
        self.rule(self.account(user=2), user=2)

        self.assertEqual(self.committed("2026-11-01"), Decimal("0"))


class EditAndDeleteRuleTests(RecurringPaymentApiTestCase):
    def body(self, account, **fields):
        return {
            "amount": "250.00",
            "category_id": self.FOOD,
            "account_id": account["id"],
            "day_of_month": 10,
            "start_date": "2026-10-01",
            **fields,
        }

    def test_editing_a_rule_leaves_existing_occurrences_alone(self):
        account = self.account(opening_date="2026-10-01")
        self.set_today("2026-10-05")
        rule = self.rule(account, start_date="2026-10-01", day_of_month=20)
        self.set_today("2026-11-16")

        response = self.call("PUT", f"{RULES}/{rule['id']}", self.body(account))

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["amount"], "250.00")
        # October was materialized before the edit, November too, with the old values.
        amounts = {item["due_date"]: item["amount"] for item in self.occurrences()}
        self.assertEqual(amounts, {"2026-11-20": "100.00", "2026-10-20": "100.00"})
        self.set_today("2026-12-01")
        amounts = {item["due_date"]: item["amount"] for item in self.occurrences()}
        self.assertEqual(amounts["2026-12-10"], "250.00")

    def test_an_edit_that_starts_earlier_does_not_backfill_history(self):
        account = self.account(opening_date="2026-09-01")
        rule = self.rule(account, start_date="2026-11-01")

        self.call("PUT", f"{RULES}/{rule['id']}", self.body(account, start_date="2026-09-01"))

        self.assertEqual(RecurringPaymentOccurrence.objects.count(), 1)

    def test_put_replaces_the_rule_and_validates_it(self):
        account = self.account()
        rule = self.rule(account)

        self.assert_rejected(
            self.call("PUT", f"{RULES}/{rule['id']}", self.body(account, amount="-1")), "amount"
        )

    def test_deleting_keeps_existing_occurrences_and_stops_new_ones(self):
        account = self.account()
        rule = self.rule(account)

        response = self.call("DELETE", f"{RULES}/{rule['id']}")

        self.assertEqual(response.status_code, 204)
        listed = self.rules()
        self.assertEqual([item["status"] for item in listed], ["deleted"])
        pending = listed[0]["occurrences"][0]
        self.assertEqual(pending["status"], "pending")
        self.assertEqual(self.committed("2026-11-01"), Decimal("100.00"))
        self.set_today("2026-12-16")
        self.assertEqual(len(self.occurrences()), 1)
        self.assertEqual(self.call("PUT", f"{RULES}/{rule['id']}", {}).status_code, 404)
        # Resolving the last pending occurrence removes the deleted rule from the list.
        self.assertEqual(self.confirm(pending).status_code, 200)
        self.assertEqual(self.rules(), [])
        self.assertEqual(self.balance(account), "900.00")

    def test_a_rule_without_occurrences_is_removed_for_good(self):
        account = self.account()
        rule = self.rule(account, start_date="2026-12-01")

        self.assertEqual(self.call("DELETE", f"{RULES}/{rule['id']}").status_code, 204)

        self.assertEqual(RecurringPayment.objects.count(), 0)

    def test_deleting_materializes_what_was_due_first(self):
        account = self.account(opening_date="2026-08-01")
        self.set_today("2026-08-12")
        rule = self.rule(account, start_date="2026-08-01", day_of_month=15)
        self.set_today("2026-11-16")

        self.call("DELETE", f"{RULES}/{rule['id']}")

        self.assertEqual(RecurringPaymentOccurrence.objects.count(), 4)


class ArchiveAccountTests(RecurringPaymentApiTestCase):
    def test_an_account_with_rules_cannot_be_archived(self):
        account = self.account()
        rule = self.rule(account)

        response = self.call("DELETE", f"/api/accounts/{account['id']}")

        self.assertEqual(response.status_code, 409, response.content)
        self.assertEqual(len(response.json()["errors"]["form"]), 2)
        self.assertEqual(self.call("DELETE", f"{RULES}/{rule['id']}").status_code, 204)
        # The deleted rule still has a pending occurrence.
        blocked = self.call("DELETE", f"/api/accounts/{account['id']}")
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(len(blocked.json()["errors"]["form"]), 1)

    def test_archives_once_rules_and_pending_occurrences_are_resolved(self):
        account = self.account()
        rule = self.rule(account)
        self.call("DELETE", f"{RULES}/{rule['id']}")
        self.cancel(self.rules()[0]["occurrences"][0])

        response = self.call("DELETE", f"/api/accounts/{account['id']}")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNotNone(response.json()["archived_at"])
        self.assertTrue(response.json()["has_records"])
