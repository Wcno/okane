import datetime

from django.db import IntegrityError, transaction

from accounts import clock
from budgets.models import Budget, BudgetMonth
from recurring_payments import schedule


def current_month():
    return schedule.month_start(clock.today())


def previous_calendar_month(month):
    return schedule.month_start(month - datetime.timedelta(days=1))


def initialize_current_month(user_id):
    """Marks the current month initialized once per User, copying the previous month into it.

    The copy happens only when the month has no Budgets yet and skips archived Categories.
    Must run inside the request transaction so the mark and the copy commit together.
    """
    month = current_month()
    try:
        with transaction.atomic():
            _, created = BudgetMonth.objects.get_or_create(user_id=user_id, month=month)
    except IntegrityError:
        return
    if not created or Budget.objects.filter(user_id=user_id, month=month).exists():
        return
    previous = Budget.objects.filter(
        user_id=user_id,
        month=previous_calendar_month(month),
        category__archived_at__isnull=True,
    )
    Budget.objects.bulk_create(
        [
            Budget(user_id=user_id, category_id=budget.category_id, month=month, amount=budget.amount)
            for budget in previous
        ],
        ignore_conflicts=True,
    )
