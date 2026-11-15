# Team review before implementation

Status: **awaiting team decision**. The existing frontend remains a demonstration
with sample data. Issues #4–#25 describe future work; none is completed by the
preparation and naming cleanup.

## Review order

1. Read [PRODUCT.md](../PRODUCT.md) and [GLOSSARY.md](../GLOSSARY.md).
2. Review the versioned [specification](spec.md), tracked by
   [issue #3](https://github.com/Wcno/okane/issues/3).
3. Check the [48 use cases](matrices.md), [contracts](contratos.md),
   [ADRs](adr/) and [code-language policy](code-language.md).
4. Review the [22 implementation tickets and their order](plan-de-trabajo.md).
   Each ticket has acceptance criteria and native GitHub blocking relationships.
5. Decide whether to approve the plan, revise it, or postpone implementation.
   Record the decision and owners in issue #3 before starting a feature branch.

## Decisions to resolve

- Confirm the scope and December 2026 delivery date, then assign ticket owners.
- Approve the proposed ADR 0004: opening balances are shown separately from
  savings and monthly Investment Return. Also review decimal precision,
  recurrence retries and monthly Budget initialization.
- Agree on the minimal backend/runtime versions and how to authenticate the
  internal `webapp` to `api-service` requests during #4/#5.
- Review the dependency order, including Recurring Payments before the full
  Remaining Budget calculation and Contributions before portfolio returns.
- Choose whether to require branch protection and reviewer approvals for future
  changes. The existing CI checks are `frontend` and `conventions`.
- Decide separately whether to enable the public demo deployment in GitHub
  Pages. The workflow remains opt-in through `PAGES_ENABLED=true`.

## Gate for starting implementation

Keep the specification and its tickets labeled `needs-team-review` while these
decisions are pending. After the team approves the plan, update the specification
first, synchronize affected tickets and dependencies, and explicitly mark the
approved work ready. The first technical ticket is #4; it is not an instruction
to implement it before that decision.
