from django.urls import path

from accounts import views as accounts
from expenses import views as expenses
from health.views import health
from recurring_payments import views as recurring_payments
from incomes import views as incomes

# Paths match the ones webapp exposes, so forwarding never rewrites them.
urlpatterns = [
    path("api/health", health),
    path("api/accounts", accounts.account_collection),
    path("api/accounts/<int:account_id>", accounts.account_detail),
    path("api/expenses", expenses.expense_collection),
    path("api/expenses/<int:expense_id>", expenses.expense_detail),
    path("api/recurring-payments", recurring_payments.rule_collection),
    path("api/recurring-payments/<int:rule_id>", recurring_payments.rule_detail),
    path(
        "api/recurring-payments/occurrences/<int:occurrence_id>",
        recurring_payments.occurrence_detail,
    ),
    path(
        "api/recurring-payments/occurrences/<int:occurrence_id>/confirm",
        recurring_payments.occurrence_confirm,
    ),
    path(
        "api/recurring-payments/occurrences/<int:occurrence_id>/cancel",
        recurring_payments.occurrence_cancel,
    ),
    path("api/incomes", incomes.income_collection),
    path("api/incomes/<int:income_id>", incomes.income_detail),
]
