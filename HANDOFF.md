# Okane handoff

Updated: 2026-11-15, America/Panama. Assistant: Codex.

## Current scope

**Pull request #36 is merged into main as e60c1bb. Ticket #4 is closed.**
The owner explicitly requested this integration. No other ticket is started. Keep the
public UI in Spanish and source code in English. Start a ticket only when the
user asks for it and its blockers are closed.

## Completed in this revision

- `api-service/`: Django REST project. `/api/health` is public, read-only and
  reports the database state; every other path requires the service
  credential in `X-Okane-Service-Key` and answers `403` without it.
- `webapp/backend/`: Django project that serves the built frontend with
  WhiteNoise, answers client-side routes with the entry page, forwards
  `/api/*` to `api-service` and exposes `/health`. Backend prefixes (`api`,
  `auth`, `users`, `health`) and missing static files never get the frontend.
- `compose.yaml`, both Dockerfiles, `.env.example` and
  `scripts/smoke-test.sh`. Only `webapp` publishes a port, on `127.0.0.1`
  unless `WEBAPP_BIND` says otherwise; the other three containers sit on
  internal networks.
- CI jobs `api-service`, `webapp` (Django checks and tests against
  PostgreSQL) and `compose` (build, start, smoke test). Dependabot also
  watches pip, Docker and Compose images.
- README, `docs/contratos.md`, `docs/plan-de-trabajo.md`, `docs/spec.md` and
  `docs/team-review.md` describe the running system.

- A two-axis code review ran on the branch. Fixed from it: a blank
  `INTERNAL_SERVICE_KEY` no longer admits requests, and `/api/../x` no longer
  reaches paths outside `/api` on `api-service`.

## Decisions taken for the team, to confirm before #5

The team had left both open; #4 could not be built without them. They are
recorded in `docs/team-review.md`.

- Runtime versions: Python 3.14, Django 5.2 LTS, Django REST framework 3.18,
  PostgreSQL 17, Node 24 for the frontend build.
- Internal authentication: a shared key in `X-Okane-Service-Key`.
- `webapp` has no Django contrib apps yet, so #5 can still choose its user
  model before the first migration.

## Notes for #5

- `webapp` keeps Django's CSRF middleware, as the contract requires for
  session writes. Nothing issues the CSRF cookie yet, so a `POST` to `/api/*`
  in the running stack answers `403` until #5 delivers the token to the
  frontend. The forwarding tests use Django's test client, which skips CSRF.
- The gateway returns only the status, body and `Content-Type` of
  `api-service`. Add other response headers when an endpoint needs them.
- Health and settings code is duplicated between the two services because
  they are separate build contexts. Extract it if a third copy appears.

## Still open

- PR CI and the post-merge main CI both passed.
- Ticket owners are not assigned or recorded in #3.
- Branch protection on `main` is not enabled. The checks to require would be
  `frontend`, `api-service`, `webapp`, `compose` and `conventions`.
- The demo deployment is opt-in and off: `PAGES_ENABLED` is not set.

## Repository and validation

- Current branch: `main`, synchronized with origin. Both local and remote `feat/container-skeleton` branches are retained.
- CI on #36 passed: `frontend`, `conventions`, `api-service` (7 tests),
  `webapp` (12 tests) and `compose` (8 smoke checks on the running stack).
- Nobody has opened the served Panel in a browser from the Compose stack;
  the smoke test checks the entry page and its script, and the frontend
  code did not change.
- This machine has Python 3.14 but no Docker and no PostgreSQL. Locally only
  the tests without the `database` tag run
  (`python manage.py test --exclude-tag database`); the database tests and
  the Compose stack were verified in CI, not locally. Local `npm run lint` is
  blocked by a Windows policy on the oxlint binary.
- Commits use the configured human Git identity, with no AI co-author
  trailers or generated-by footers.

## Development setup

Full system: copy `.env.example` to `.env`, then
`docker compose up --build --wait` and open port 8000. Frontend only: Node 24
/ npm 11, in `webapp/frontend` run `npm ci`, `npm run dev` or `npm run check`.
Service tests: see "Development checks" in the README.

## Attribution and existing clones

Main history was rewritten earlier on 2026-11-15 to remove AI co-author
trailers from 13 commits while preserving file trees and human authorship.
Older clones must resynchronize with the current history; do not merge the
pre-cleanup history back. `.claude/settings.json` disables automatic AI
attribution; use the configured human Git identity.

## Integration checkpoint

- Objective: integrate #36. GitHub confirms MERGED and #4 CLOSED.
- Verified exact PR head ae3a544: all five CI jobs passed, no review threads,
  no submitted reviews, no merge conflicts, and no native blockers for #4.
- Main merge commit e60c1bb uses the configured human Git identity.
- Pre-merge worktree was clean; origin was fetched; diff whitespace check passed.
- Main CI run: https://github.com/Wcno/okane/actions/runs/43801591808 (success).
- This checkpoint is committed after the merge; no unrelated or pending implementation files. No integration blockers.

## Next step

1. Integration is complete. Confirm or correct the two decisions above before #5.
2. When the user asks, start #5 (sign-up, login and sessions), which only
   depended on #4.
