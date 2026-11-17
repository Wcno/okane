from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, ValidationError
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


@api_view(["GET", "PUT", "DELETE"])
@transaction.atomic
def account_detail(request, account_id):
    account = owned_account_for_update(request, account_id)
    if request.method == "GET":
        return Response(represent(account))
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


STATEMENT_FIELDS = ("category_id", "counterpart_account_id", "asset")
STATEMENT_DECIMALS = ("units", "commission")


def represent_statement_line(line):
    return {
        "id": line["id"],
        "kind": line["kind"],
        "record_id": line["record_id"],
        "date": line["date"].isoformat(),
        "description": line["description"],
        "amount": str(line["amount"]),
        "balance": str(line["balance"]),
        **{name: line[name] for name in STATEMENT_FIELDS if name in line},
        **{
            name: None if line[name] is None else str(line[name])
            for name in STATEMENT_DECIMALS
            if name in line
        },
    }


@api_view(["GET"])
def account_statement(request, account_id):
    """Every movement of the Account with its running Balance, oldest first or `order=desc`."""
    account = Account.objects.filter(user_id=request.okane_user_id, pk=account_id).first()
    if account is None:
        raise NotFound
    order = request.query_params.get("order", "asc")
    if order not in ("asc", "desc"):
        raise ValidationError({"order": ["Usa asc para del más antiguo o desc para del más reciente."]})
    lines = ledger.statement(account)
    if order == "desc":
        lines.reverse()
    page_lines, page = paginate(request, lines)
    return Response({"results": [represent_statement_line(line) for line in page_lines], **page})
