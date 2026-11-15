# Team review before implementation

Status: **plan approved by the team on 2026-11-15; implementation not started**.
The team approved issues #4–#25 and #30–#32, which now carry `ready-for-agent`.
The existing frontend remains a demonstration with sample data; no ticket is
completed yet. The approval is recorded in issue #3.

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

## Decisions still open

The approval covers the specification, contracts, ADRs 0004 and 0005, the
25 tickets and their dependencies. These points were not part of it and still
need an answer:

- Assign an owner to each ticket and record the owners in issue #3.
- Agree on the minimal backend/runtime versions and how to authenticate the
  internal `webapp` to `api-service` requests during #4/#5.
- Choose whether to require branch protection and reviewer approvals for future
  changes. The existing CI checks are `frontend` and `conventions`.
- Decide whether to enable the public demo deployment in GitHub Pages. The
  workflow remains opt-in through `PAGES_ENABLED=true`.

## Decisions resolved by the approval

- Scope of 76 stories, 58 cases and 25 tickets, for the December 2026 delivery.
- Recurring-payment reservations with manual confirmation or cancellation,
  the unified Movements view with six record types, and presentation-only
  preferences.
- Projection scenarios for savings, an investment account or the full portfolio.
- ADR 0004 (opening balances shown apart from savings and monthly Investment
  Return) and ADR 0005 (public API through webapp with personal tokens), both
  now accepted.
- Access limits, pagination bounds and the interface quality contract in
  [contratos.md](contratos.md).
- The dependency order, including the 13-ticket minimum path for the 28 course
  cases, where #9 waits for #17 and #13 waits for #16.

## Starting implementation

The gate is open: the tickets are approved and labeled `ready-for-agent`. Work
follows the dependency order in [plan-de-trabajo.md](plan-de-trabajo.md),
starting with #4, the only ticket without blockers. Any later change of scope
still goes spec first, then tickets and dependencies.
