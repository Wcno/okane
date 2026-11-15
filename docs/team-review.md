# Team review before implementation

Status: **awaiting team decision**. The existing frontend remains a demonstration
with sample data. Issues #4–#25 and #30–#32 describe future work; none is completed by the
preparation and naming cleanup.

## Review order

1. Read [PRODUCT.md](../PRODUCT.md) and [GLOSSARY.md](../GLOSSARY.md).
2. Review the versioned [specification](spec.md), tracked by
   [issue #3](https://github.com/Wcno/okane/issues/3).
3. Check the [58 use cases](matrices.md), [contracts](contratos.md),
   [ADRs](adr/) and [code-language policy](code-language.md).
4. Review the [25 implementation tickets and their order](plan-de-trabajo.md).
   Each ticket has acceptance criteria and native GitHub blocking relationships.
5. Decide whether to approve the plan, revise it, or postpone implementation.
   Record the decision and owners in issue #3 before starting a feature branch.

## Decisions to resolve

- Confirm the scope and December 2026 delivery date, then assign ticket owners.
- Review the incorporated feedback: reservations remain committed until manual
  confirmation/cancellation, including overdue amounts; one filtered Movements
  view includes all six record types; preferences affect presentation only.
- Review the projection scenarios for savings, an investment account or the full
  portfolio, with hypothetical returns and no changes to actual financial records.
- Review proposed ADR 0005 and the public API scope: personal tokens, read access
  and creation on existing Accounts, retry idempotency, OpenAPI and a Google Apps
  Script example. OAuth and automatic synchronization are outside this delivery.
- Confirm the expanded scope of 76 stories, 58 cases and 25 tickets. A feature
  depending on Dividends cannot be delivered with all six types if #22 is cut.
- Approve the proposed ADR 0004: opening balances are shown separately from
  savings and monthly Investment Return. Also review decimal precision,
  recurrence retries and monthly Budget initialization.
- Agree on the minimal backend/runtime versions and how to authenticate the
  internal `webapp` to `api-service` requests during #4/#5.
- Review the dependency order, including Recurring Payments before the full
  Remaining Budget calculation and Contributions before portfolio returns.
- Choose whether to require branch protection and reviewer approvals for future
  changes. The existing CI checks are `frontend` and `conventions`.
- Review the proposed access limits and quality contract: ten-character
  passwords, attempt limiting on sign-in, recovery and tokens, session and
  reset-link lifetimes, a per-token request limit, pagination bounds, and the
  keyboard, contrast, empty-state and viewport checks for every screen.
- Review the minimum path for the 28 course cases: 13 tickets, because #9 waits
  for #17 and #13 waits for #16. Decide whether to accept that path or let #9
  ship its Remaining Budget without reservations first.
- Decide separately whether to enable the public demo deployment in GitHub
  Pages. The workflow remains opt-in through `PAGES_ENABLED=true`.

## Gate for starting implementation

Keep the specification and its tickets labeled `needs-team-review` while these
decisions are pending. After the team approves the plan, update the specification
first, synchronize affected tickets and dependencies, and explicitly mark the
approved work ready. The first technical ticket is #4; it is not an instruction
to implement it before that decision.
