from django.urls import path

from accounts import views as accounts
from expenses import views as expenses
from health.views import health
from investments import views as investments

# Paths match the ones webapp exposes, so forwarding never rewrites them.
urlpatterns = [
    path("api/health", health),
    path("api/accounts", accounts.account_collection),
    path("api/accounts/<int:account_id>", accounts.account_detail),
    path("api/expenses", expenses.expense_collection),
    path("api/expenses/<int:expense_id>", expenses.expense_detail),
    path("api/investments/assets/search", investments.asset_search),
    path("api/investments/transactions", investments.transaction_collection),
    path("api/investments/transactions/buy", investments.buy),
    path("api/investments/transactions/sell", investments.sell),
    path("api/investments/transactions/<int:transaction_id>", investments.transaction_detail),
    path("api/investments/positions", investments.positions),
]
