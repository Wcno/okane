"""What each Category has spent and committed in a month, and what is left of its Budget."""

from decimal import Decimal

from django.db.models import Q, Sum

from budgets.models import Budget
from expenses.categories import CATEGORY_IDS
from expenses.models import Expense
from recurring_payments import reservations, schedule

ZERO = Decimal("0.00")


def spent_by_category(user_id, month):
    expenses = Expense.objects.filter(
        user_id=user_id, date__gte=month, date__lte=schedule.month_end(month)
    )
    return {
        row["category_id"]: row["total"]
        for row in expenses.order_by().values("category_id").annotate(total=Sum("amount"))
    }


def committed_by_category(user_id, month):
    """Per Category: everything committed at the month's cutoff, and the part carried over.

    The carried-over part belongs to occurrences of earlier months still pending.
    """
    rows = (
        reservations.committed(user_id, month)
        .order_by()
        .values("category_id")
        .annotate(total=Sum("amount"), carried=Sum("amount", filter=Q(month__lt=month)))
    )
    return {row["category_id"]: (row["total"], row["carried"] or ZERO) for row in rows}


def represent_month(user_id, month):
    """One row per Category of the catalog, with or without a Budget."""
    budgets = {
        budget.category_id: budget for budget in Budget.objects.filter(user_id=user_id, month=month)
    }
    spent = spent_by_category(user_id, month)
    committed = committed_by_category(user_id, month)
    return [
        represent_row(
            category_id,
            month,
            budgets.get(category_id),
            spent.get(category_id, ZERO),
            *committed.get(category_id, (ZERO, ZERO)),
        )
        for category_id in CATEGORY_IDS
    ]


def represent_budget(budget):
    category_id = budget.category_id
    spent = spent_by_category(budget.user_id, budget.month).get(category_id, ZERO)
    committed = committed_by_category(budget.user_id, budget.month)
    return represent_row(
        category_id, budget.month, budget, spent, *committed.get(category_id, (ZERO, ZERO))
    )


def represent_row(category_id, month, budget, spent, committed, carried_over):
    """Restante = Presupuesto - gastado - Comprometido; without a Budget there is none."""
    remaining = None if budget is None else budget.amount - spent - committed
    return {
        "id": None if budget is None else budget.id,
        "category_id": category_id,
        "month": month.strftime("%Y-%m"),
        "amount": None if budget is None else str(budget.amount),
        "spent": str(spent),
        "committed": str(committed),
        "carried_over": str(carried_over),
        "remaining": None if remaining is None else str(remaining),
        "exceeded": remaining is not None and remaining < 0,
    }
