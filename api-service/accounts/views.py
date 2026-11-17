from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from accounts import ledger
from accounts.models import Account
from accounts.serializers import AccountSerializer, AccountUpdateSerializer
from config.rest import paginate


def represent_all(accounts):
    context = {
        "balances": ledger.balances(accounts),
        "net_contributions": ledger.net_contributions(accounts),
        "with_records": ledger.accounts_with_records(accounts),
    }
    return AccountSerializer(accounts, many=True, context=context).data


def represent(account):
    return represent_all([account])[0]


def owned_account_for_update(request, account_id):
    """Lock the User's Account; another User's id is as absent as an unknown one."""
    account = (
        Account.objects.select_for_update()
        .filter(user_id=request.okane_user_id, pk=account_id)
        .first()
    )
    if account is None:
        raise NotFound
    return account


@api_view(["GET", "POST"])
def account_collection(request):
    if request.method == "POST":
        serializer = AccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = serializer.save(user_id=request.okane_user_id)
        return Response(represent(account), status=201)
    accounts, page = paginate(request, Account.objects.filter(user_id=request.okane_user_id))
    return Response({"results": represent_all(accounts), **page})


@api_view(["PUT", "DELETE"])
@transaction.atomic
def account_detail(request, account_id):
    account = owned_account_for_update(request, account_id)
    if request.method == "PUT":
        serializer = AccountUpdateSerializer(account, data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(represent(serializer.save()))

    # Deleting an Account with records would rewrite history, so it is archived (ADR 0002).
    if not ledger.accounts_with_records([account]):
        account.delete()
        return Response(status=204)
    if account.archived_at is None:
        blockers = ledger.archive_blockers(account)
        if blockers:
            return Response({"errors": {"form": blockers}}, status=409)
        account.archived_at = timezone.now()
        account.save(update_fields=["archived_at"])
    return Response(represent(account))
