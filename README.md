# Okane

[![CI](https://github.com/Wcno/okane/actions/workflows/ci.yml/badge.svg)](https://github.com/Wcno/okane/actions/workflows/ci.yml)

Okane is a personal finance web application for a Spanish-speaking public.
It brings monthly budgeting and an investment portfolio together to answer:

1. How much can I spend through the end of the month?
2. What explains the change in my net worth?

Final project for Metodología para el Desarrollo de Sistemas, Universidad
Tecnológica de Panamá, group 1M321.

## Current status

**The team approved the plan on 2026-11-15. The first ticket, the container
skeleton ([#4](https://github.com/Wcno/okane/issues/4)), is implemented.**
One command starts the four containers: `webapp` serves the frontend
demonstration and forwards `/api/*` to `api-service`. The screens still use
in-memory sample data that resets on refresh; there are no users or financial
records yet.

| Area | Status |
|---|---|
| Product, domain glossary, use-case matrices and design system | Documented |
| Specification, contracts and ADRs 0001 to 0005 | Approved |
| 25 implementation tickets (#4–#25, #30–#32) | Approved, labeled `ready-for-agent`; #4 implemented |
| Frontend demonstration | Available with sample data |
| Four containers with Docker Compose | Available: health checks and `/api/*` forwarding |
| Authentication, accounts and the other features | Not implemented |
| Tests | Frontend units, HTTP tests of both services, smoke test of the stack |

The next ticket is [#5](https://github.com/Wcno/okane/issues/5), sign-up and
sessions. Three decisions remain open in the
[team review guide](docs/team-review.md): ticket owners, branch protection on
`main`, and whether to publish the demo.

## Scope

The approved [specification](docs/spec.md) covers 76 user stories and 58 use
cases, including the 28 original course cases. Beyond those, it plans:

- Income, transfers and recurring-payment reservations that stay committed
  until the user confirms or cancels them.
- One Movements view with filters for all six record types.
- Savings and investment projections with up to three scenarios.
- Visual preferences per user.
- An authenticated public API for personal scripts, with OpenAPI and a Google
  Apps Script example.

The 28 course cases need 13 of the 25 tickets; see the
[minimum path](docs/plan-de-trabajo.md#ruta-mínima-para-los-28-casos-del-curso).

## Run the full system

Requirements: Git and Docker with Compose.

```shell
cp .env.example .env
docker compose up --build --wait
```

Open <http://localhost:8000>. [.env.example](.env.example) documents every
variable; its values are placeholders for local use, so replace the secrets
before exposing the system to anyone else.

| Address | Answer |
|---|---|
| `/dashboard` and the other screens | The frontend, served by `webapp` |
| `/api/health` | The readiness of `api-service` and `api-db`, forwarded by `webapp` |
| `/health` | The readiness of `webapp` and `webapp-db` |

Only `webapp` publishes a port. `docker compose ps` shows which container is
not healthy, and `bash scripts/smoke-test.sh` checks the running system. Stop
it with `docker compose down`; add `--volumes` to delete the databases too.

## Run only the frontend

Requirements: Git, **Node.js 24** and **npm 11**. The frontend `.nvmrc` declares
the Node major version. The demo needs no database or configuration.

```shell
cd webapp/frontend
npm ci
npm run dev
```

Open the local URL printed by Vite. Routes other than `/dashboard` show a
placeholder until their tickets are implemented.

## Development checks

Run these commands from `webapp/frontend`:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the frontend development server |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Check source with oxlint |
| `npm test` | Run the Vitest tests |
| `npm run build` | Produce the frontend build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Run types, lint, tests and build together |

The frontend tests cover the demonstration calculations and money formatting.

Each Django service has HTTP tests. They need **Python 3.14** and a reachable
PostgreSQL; set `DATABASE_HOST`, `DATABASE_USER` and `DATABASE_PASSWORD` if it
does not match the defaults in `config/settings.py`. Run them from `api-service`
or from `webapp/backend`:

```shell
pip install -r requirements.txt
export DJANGO_SECRET_KEY=local-only INTERNAL_SERVICE_KEY=local-only
python manage.py test
```

Without PostgreSQL, `python manage.py test --exclude-tag database` runs the
tests that do not touch the database. Browser tests arrive with their tickets.

## Documentation

| Document | Purpose |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Audience, product goals and constraints |
| [GLOSSARY.md](GLOSSARY.md) | Canonical Spanish domain vocabulary |
| [docs/spec.md](docs/spec.md) | Versioned specification with 76 user stories |
| [docs/matrices.md](docs/matrices.md) | 58 use cases with routes, endpoints, tables and containers |
| [docs/contratos.md](docs/contratos.md) | Testable contracts and numerical examples |
| [docs/adr/](docs/adr/) | Architecture decisions, ADRs 0001 to 0005 |
| [docs/plan-de-trabajo.md](docs/plan-de-trabajo.md) | 25 tickets in a valid dependency order |
| [docs/team-review.md](docs/team-review.md) | Approved decisions and those still open |
| [docs/code-language.md](docs/code-language.md) | English code names for the Spanish vocabulary |
| [DESIGN.md](DESIGN.md) | Visual system for the public interface |

[Issue #3](https://github.com/Wcno/okane/issues/3) is the index of the spec and
records the team's decision. Each ticket has acceptance criteria and native
GitHub dependencies.

## Language

- Public UI copy, accessible labels and localized presentation data: **Spanish**.
- Source code, identifiers, filenames, comments, test descriptions and commit
  messages: **English**.

## Architecture

The course fixes four containers. All four run today; the responsibilities
below arrive with their tickets.

| Container | Technology | Responsibility |
|---|---|---|
| `webapp` | React + Django 5.2 | Public interface, authentication and `/api/*` forwarding |
| `webapp-db` | PostgreSQL 17 | Users, credentials and sessions |
| `api-service` | Django REST | Accounts, movements, budgets and investments |
| `api-db` | PostgreSQL 17 | Financial records |

The browser communicates only with `webapp`
([ADR 0001](docs/adr/0001-webapp-como-unico-punto-de-entrada.md)). `webapp`
rebuilds each `/api/*` request and adds a shared service credential;
`api-service` rejects any financial request without it, and stays with both
databases on internal networks.

## Contributing

1. Pick a ticket labeled `ready-for-agent` whose blockers are closed, and
   branch from current `main` with an English name such as
   `feat/accounts-derived-balance`.
2. Write small [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(accounts): create spending accounts`.
3. Open a pull request with the template. Its title also follows Conventional
   Commits, because it becomes the squashed commit on `main`.
4. Merge after CI passes, then delete the branch.
5. A change of scope goes to the spec first, then to tickets and dependencies.

## CI and delivery

Every pull request and every commit on `main` runs:

- **frontend:** exact install from the lockfile, types, lint, tests and build.
- **api-service** and **webapp:** Django checks, migration check and HTTP tests
  against PostgreSQL.
- **compose:** builds and starts the four containers from `.env.example`, then
  runs `scripts/smoke-test.sh` against the running system.
- **conventions:** the pull request title and each commit message follow
  Conventional Commits.

Actions are pinned by commit and the workflow has read-only permissions.
Dependabot proposes npm, pip, Docker image and action updates weekly.

Commits on `main` also package the demo. Publishing it to GitHub Pages is off
until the team enables it: set Pages to use GitHub Actions as its source and
define the repository variable `PAGES_ENABLED=true`. Branch protection on
`main` is not enabled yet.

## Working with assistants

Codex reads [AGENTS.md](AGENTS.md); Claude Code imports it through
[CLAUDE.md](CLAUDE.md). Both read [HANDOFF.md](HANDOFF.md) for the latest
checkpoint and verify it against the repository. An assistant starts a ticket
only when asked. Commits stay under the contributor's own Git identity, with no
AI co-author trailers.
