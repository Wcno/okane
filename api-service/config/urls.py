from django.urls import path
from django.views.decorators.http import require_safe

from accounts import movements
from accounts import views as accounts
from erasure import views as erasure
from budgets import views as budgets
from expenses import views as expenses
from health.views import health
from investments import views as investments
from transfers import views as transfers
from incomes import views as incomes
from public_api import views as public_api
from recurring_payments import views as recurring_payments

# Paths match the ones webapp exposes, so forwarding never rewrites them.
# Internal calls from webapp that no browser route reaches (docs/contratos.md).
urlpatterns = [
    path("internal/users/me", erasure.erase_current_user),
    path("api/health", health),
    path("api/accounts", accounts.account_collection),
    path("api/accounts/<int:account_id>", accounts.account_detail),
    path("api/movements", movements.movement_collection),
    # The public API (`/api/v1`): webapp lets only the calls of docs/contratos.md through.
    path("api/v1/accounts", require_safe(accounts.account_collection)),
    path("api/v1/budgets", require_safe(budgets.budget_collection)),
    path("api/v1/movements", public_api.movement_collection),
    path("api/expenses", expenses.expense_collection),
    path("api/expenses/<int:expense_id>", expenses.expense_detail),
    path("api/investments/assets/search", investments.asset_search),
    path("api/investments/transactions", investments.transaction_collection),
    path("api/investments/transactions/buy", investments.buy),
    path("api/investments/transactions/sell", investments.sell),
    path("api/investments/transactions/dividend", investments.dividend),
    path("api/investments/transactions/<int:transaction_id>", investments.transaction_detail),
    path("api/investments/positions", investments.positions),
    path("api/investments/dashboard", investments.dashboard),
    path("api/investments/performance", investments.performance),
    path("api/investments/assets/<int:asset_id>/price", investments.asset_price),
    path("api/transfers", transfers.transfer_collection),
    path("api/transfers/<int:transfer_id>", transfers.transfer_detail),
    path("api/budgets", budgets.budget_collection),
    path("api/budgets/<int:budget_id>", budgets.budget_detail),
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
