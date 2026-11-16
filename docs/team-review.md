# Team review before implementation

Status: **plan approved by the team on 2026-11-15; ticket #4 implemented**.
The team approved issues #4–#25 and #30–#32, which carry `ready-for-agent`.
The four containers run; the screens remain a demonstration with sample data.
The approval is recorded in issue #3.

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
- Choose whether to require branch protection and reviewer approvals for future
  changes. The existing CI checks are `frontend` and `conventions`.
- Decide whether to enable the public demo deployment in GitHub Pages. The
  workflow remains opt-in through `PAGES_ENABLED=true`.

## Decisions taken while implementing #4

The team had left these two open. Ticket #4 could not be built without them,
so its pull request chose the options below. They are easy to change now and
costly later: the team should confirm or correct them before #5 starts.

- **Runtime versions:** Python 3.14, Django 5.2 LTS, Django REST framework
  3.18, PostgreSQL 17, Node 24 for the frontend build. Exact versions are
  pinned in each `requirements.txt` and Dockerfile.
- **Internal authentication:** a shared key sent by `webapp` in
  `X-Okane-Service-Key` and compared in constant time by `api-service`, as
  described in [contratos.md](contratos.md). A signature per request was the
  alternative; it adds key handling without a benefit while both services
  share one private network.

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
which #4 opened. The next ticket is #5. Any later change of scope
still goes spec first, then tickets and dependencies.
