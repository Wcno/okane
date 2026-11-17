from django.urls import path

from accounts import views as accounts
from expenses import views as expenses
from health.views import health

# Paths match the ones webapp exposes, so forwarding never rewrites them.
urlpatterns = [
    path("api/health", health),
    path("api/accounts", accounts.account_collection),
    path("api/accounts/<int:account_id>", accounts.account_detail),
    path("api/expenses", expenses.expense_collection),
    path("api/expenses/<int:expense_id>", expenses.expense_detail),
]
