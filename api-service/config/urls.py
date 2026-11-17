from django.urls import path

from accounts import views as accounts
from expenses import views as expenses
from health.views import health
from investments import views as investments
from transfers import views as transfers
from incomes import views as incomes

# Paths match the ones webapp exposes, so forwarding never rewrites them.
urlpatterns = [
    path("api/health", health),
    path("api/accounts", accounts.account_collection),
    path("api/accounts/<int:account_id>", accounts.account_detail),
    path("api/accounts/<int:account_id>/statement", accounts.account_statement),
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
    path("api/incomes", incomes.income_collection),
    path("api/incomes/<int:income_id>", incomes.income_detail),
]
