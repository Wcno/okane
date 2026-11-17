"""The Panel: Disponible, Restante, Comprometido, Patrimonio and Saldos in one read."""

from decimal import ROUND_DOWN, Decimal

from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts import clock, ledger
from accounts.models import Account
from budgets import remaining
from expenses.models import Expense
from incomes.models import Income
from recurring_payments import reservations, schedule
from recurring_payments.serializers import represent_occurrence

CENTS = Decimal("0.01")
ZERO = Decimal("0.00")


def total(amounts):
    return sum(amounts, ZERO)


def month_total(model, user_id, month):
    amounts = model.objects.filter(
        user_id=user_id, date__gte=month, date__lte=schedule.month_end(month)
    ).values_list("amount", flat=True)
    return total(amounts)


def daily_amount(available, today):
    """Disponible over the days from today to month end, today included; the last day divides by one."""
    days_left = (schedule.month_end(today) - today).days + 1
    return (available / days_left).quantize(CENTS, rounding=ROUND_DOWN), days_left


def represent_account(account, balance):
    return {
        "id": account.id,
        "name": account.name,
        "type": account.type,
        "balance": str(balance),
        "archived": account.archived_at is not None,
    }


@api_view(["GET"])
@transaction.atomic
def dashboard(request):
    user_id = request.okane_user_id
    today = clock.today()
    month = schedule.month_start(today)
    reservations.materialize(user_id)

    accounts = list(Account.objects.filter(user_id=user_id))
    balances = ledger.balances(accounts)
    spending_ids = {account.id for account in accounts if account.type == Account.Type.SPENDING}

    pending = list(reservations.committed(user_id, month).order_by("due_date", "id"))
    on_spending = [item for item in pending if item.account_id in spending_ids]
    committed = total(item.amount for item in on_spending)
    spending_balance = total(balances[account_id] for account_id in spending_ids)
    available = spending_balance - committed
    per_day, days_left = daily_amount(available, today)

    income = month_total(Income, user_id, month)
    expenses = month_total(Expense, user_id, month)
    budgets = [row for row in remaining.represent_month(user_id, month) if row["id"] is not None]
    represented = [represent_occurrence(item) for item in pending]

    return Response(
        {
            "month": month.strftime("%Y-%m"),
            "today": today.isoformat(),
            "days_left": days_left,
            "available": str(available),
            "spending_balance": str(spending_balance),
            "committed": str(committed),
            "committed_count": len(on_spending),
            "per_day": str(per_day),
            "net_worth": str(total(balances.values())),
            "income": str(income),
            "expenses": str(expenses),
            "net_savings": str(income - expenses),
            "budgets": budgets,
            "overdue": [item for item in represented if item["status"] == "overdue"],
            "upcoming": [item for item in represented if item["status"] != "overdue"],
            "accounts": [
                represent_account(account, balances[account.id])
                for account in accounts
                if account.archived_at is None or balances[account.id] != 0
            ],
        }
    )
