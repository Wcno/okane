from django.urls import path

from accounts import views as accounts
from erasure import views as erasure
from expenses import views as expenses
from health.views import health
from incomes import views as incomes

# Paths match the ones webapp exposes, so forwarding never rewrites them.
# Internal calls from webapp that no browser route reaches (docs/contratos.md).
urlpatterns = [
    path("internal/users/me", erasure.erase_current_user),
    path("api/health", health),
    path("api/accounts", accounts.account_collection),
    path("api/accounts/<int:account_id>", accounts.account_detail),
    path("api/expenses", expenses.expense_collection),
    path("api/expenses/<int:expense_id>", expenses.expense_detail),
    path("api/incomes", incomes.income_collection),
    path("api/incomes/<int:income_id>", incomes.income_detail),
]
