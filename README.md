# Okane

[![CI](https://github.com/Wcno/okane/actions/workflows/ci.yml/badge.svg)](https://github.com/Wcno/okane/actions/workflows/ci.yml)

Okane is a personal finance web application for a Spanish-speaking public.
It brings monthly budgeting and an investment portfolio together to answer:

1. How much can I spend through the end of the month?
2. What explains the change in my net worth?

Final project for Metodología para el Desarrollo de Sistemas, Universidad
Tecnológica de Panamá, group 1M321.

## Current status

**Prepared for team review. Implementation of issues #4–#25 and #30–#32 has not started.**
The existing `/dashboard`, navigation and quick expense entry are a frontend
demonstration with in-memory sample data. Refreshing resets that data.

| Area | Status |
|---|---|
| Product, domain glossary, use-case matrices and design system | Documented |
| Versioned specification and 25 implementation tickets | Awaiting team review |
| Existing frontend demonstration | Available with sample data |
| Backend services, authentication and databases | Planned; not implemented |
| Docker Compose and full-system tests | Planned in the implementation tickets |

The team will review the specification, dependencies and proposed decisions
before authorizing implementation. See the [team review guide](docs/team-review.md).

The latest specification includes recurring-payment reservations with manual
confirmation, one Movements view with filters, savings and investment projection
scenarios, visual preferences and an authenticated public API for personal scripts.
These are planned capabilities; the current demo remains unchanged.
The [implementation order](docs/plan-de-trabajo.md) covers 76 user stories,
58 use cases (including the 28 original course cases) and 46 dependencies.
The API ticket includes OpenAPI and a Google Apps Script example for its delivery.

## Language

- Public UI copy, accessible labels and localized presentation data: **Spanish**.
- Source code, identifiers, source filenames, comments and test descriptions:
  **English**.
- The [domain glossary](GLOSSARY.md) keeps the Spanish product vocabulary;
  [code-language.md](docs/code-language.md) maps it to English code names.

## Run the current demonstration

Requirements: Git, **Node.js 24** and **npm 11**. The frontend `.nvmrc` declares
the Node major version; `package.json` declares the supported engine ranges.
The current demo needs no database configuration.

From the repository root:

```shell
cd webapp/frontend
npm ci
npm run dev
```

Open the local URL printed by Vite. The public interface remains in Spanish.
The rest of the routes are placeholders for the team-approved implementation plan.

## Development checks

Run these commands from `webapp/frontend`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the frontend development server |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Check source with oxlint |
| `npm test` | Run the existing Vitest tests |
| `npm run build` | Produce the frontend build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Run types, lint, tests and build together |

The existing tests validate the demonstration calculations and money formatting.
They do not establish that the planned backend exists. Backend HTTP and browser
tests will be added in their approved tickets. EditorConfig and Git attributes
keep text files consistent across Windows, macOS and Linux.

## Specification and planning

| Document | Purpose |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Audience, product goals and constraints |
| [GLOSSARY.md](GLOSSARY.md) | Canonical Spanish domain vocabulary |
| [docs/spec.md](docs/spec.md) | Versioned specification with 76 user stories |
| [docs/matrices.md](docs/matrices.md) | 58 use cases, routes, endpoints and containers |
| [docs/contratos.md](docs/contratos.md) | Testable contracts and numerical examples |
| [docs/adr/](docs/adr/) | Architecture decisions; ADRs 0004 and 0005 are proposed for review |
| [docs/plan-de-trabajo.md](docs/plan-de-trabajo.md) | 25 tickets in a valid dependency order |
| [docs/team-review.md](docs/team-review.md) | Review agenda and implementation gate |
| [docs/code-language.md](docs/code-language.md) | English code names and Spanish presentation policy |
| [DESIGN.md](DESIGN.md) | Visual system for the public interface |

[Issue #3](https://github.com/Wcno/okane/issues/3) is the review index.
Issues #4–#25 and #30–#32 contain acceptance criteria and native GitHub dependencies.
Requirements are clarified in the spec first, then reflected in tickets.
Implementation starts only after the team records its decision.

## Planned architecture

The course fixes four containers. This table describes the target architecture,
not services already running in the repository.

| Container | Technology | Responsibility |
|---|---|
| `webapp` | React + Django | Public interface, authentication and `/api/*` forwarding |
| `webapp-db` | PostgreSQL | Users, credentials and sessions |
| `api-service` | Django REST | Financial accounts, entries, budgets and investments |
| `api-db` | PostgreSQL | Financial records |

The browser will communicate only with `webapp`, as specified in
[ADR 0001](docs/adr/0001-webapp-como-unico-punto-de-entrada.md).

## Contribution and delivery

1. Clarify and approve the spec, then synchronize ticket criteria and dependencies.
2. After team approval, select an unblocked ticket and branch from current `main`.
3. Use English branch names and small Conventional Commits, for example
   `feat(accounts): create spending accounts`.
4. Open a PR, pass CI and follow the team's review decision before merging.
5. Delete a completed branch only after its work is preserved in `main`.

CI checks the existing frontend and Conventional Commit titles/messages on PRs.
Main pushes also produce the demo artifact. GitHub Pages deployment remains
opt-in: the repository must use GitHub Actions as its Pages source and define
`PAGES_ENABLED=true`. Enabling publication is a separate team decision.
Dependabot proposes dependency and action updates weekly.
The Node type definitions stay on the supported Node 24 major; changing the
runtime major requires an explicit development-environment decision.

## Switching assistants

Codex reads [AGENTS.md](AGENTS.md); Claude Code imports those instructions from
[CLAUDE.md](CLAUDE.md). Both use [HANDOFF.md](HANDOFF.md) for the latest checkpoint.
When switching, ask the next assistant to read it and verify the current state.
The checkpoint preserves the current restriction: prepare and review first,
without starting the implementation issues.
