"""Materializes reservations and answers what is committed at a cutoff."""

from django.db import transaction

from accounts import clock
from recurring_payments import schedule
from recurring_payments.models import RecurringPayment, RecurringPaymentOccurrence


@transaction.atomic
def materialize(user_id):
    """Create every due occurrence from each rule's start to the end of the current month.

    Months nobody opened the app are recovered. Creating a reservation never
    creates an Expense or changes a Balance. A unique constraint per rule and
    month keeps concurrent calls from duplicating rows.
    """
    this_month = schedule.month_start(clock.today())
    rules = RecurringPayment.objects.select_for_update().filter(
        user_id=user_id, deleted_at__isnull=True
    )
    for rule in rules:
        month = (
            schedule.month_start(rule.start_date)
            if rule.materialized_through is None
            else schedule.next_month(rule.materialized_through)
        )
        occurrences = []
        while month <= this_month:
            due = schedule.due_date(month, rule.day_of_month)
            # The first due date is the first one on or after the start.
            if due >= rule.start_date:
                occurrences.append(
                    RecurringPaymentOccurrence(
                        user_id=user_id,
                        recurring_payment=rule,
                        month=month,
                        amount=rule.amount,
                        account_id=rule.account_id,
                        category_id=rule.category_id,
                        description=rule.description,
                        due_date=due,
                        reserved_from=max(month, rule.start_date),
                    )
                )
            rule.materialized_through = month
            month = schedule.next_month(month)
        if occurrences:
            RecurringPaymentOccurrence.objects.bulk_create(occurrences, ignore_conflicts=True)
        if rule.materialized_through is not None:
            rule.save(update_fields=["materialized_through"])


def committed(user_id, month):
    """The occurrences still reserved for `month`, as they stood at its cutoff.

    The cutoff is today for the current month and the last day for a past one.
    An occurrence counts when it entered the reserve by the cutoff, is due by
    the month's end and was not resolved, with effect, by the cutoff. A
    carried-over occurrence appears once per cutoff, never once per month.
    """
    month_end = schedule.month_end(month)
    cutoff = min(clock.today(), month_end)
    return RecurringPaymentOccurrence.objects.filter(
        user_id=user_id, reserved_from__lte=cutoff, due_date__lte=month_end
    ).exclude(resolved_on__lte=cutoff)
