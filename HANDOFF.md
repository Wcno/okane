# Okane handoff

Updated: 2026-11-16, America/Panama. Assistant: Claude Code.

## Current scope

Updated 2026-11-16 by Claude Code (Opus 5.5). Objective: groundwork for
autonomous ticket runs. Branch `chore/autonomous-groundwork`, delivered as one
PR. #4 is closed; no implementation ticket is started. Start a ticket only when
the user asks for it and its blockers are closed.

## Completed in this revision

- `scripts/worktree-stack.sh` lets a git worktree run its own Compose stack
  beside the main checkout through ignored `.env` and `compose.override.yaml`.
  `compose.yaml` keeps the container names the course requires.
- `scripts/smoke-test.sh` works under any project name and checks the
  container names in `compose.yaml` itself.
- `e2e/` holds Playwright tests on desktop and mobile widths. The first spec
  checks the Spanish shell, console errors, failed requests and horizontal
  overflow. CI runs it in the `compose` job; Dependabot watches `/e2e`.
- `.claude/agents/ticket-worker.md` (Opus) and `.claude/agents/ui-qa.md`
  (Sonnet), plus the user-invoked `/ticket-loop` runbook in
  `.claude/skills/ticket-loop/`. The orchestrator session runs on Fable 5.2.
  The loop opens stacked PRs on its blockers' branches; the user merges them,
  bottom first, with merge commits.
- Verified locally: main and worktree stacks ran side by side, both passed the
  smoke test, and 12 browser checks passed against the main stack. Claude in
  Chrome opened the Panel from the stack with no console errors.
- PR #40 CI passed on every job, including the new browser tests.

## Previous revision: container skeleton (#4)

- `api-service/`: Django REST project. `/api/health` is public, read-only and
  reports the database state; every other path requires the service
  credential in `X-Okane-Service-Key` and answers `403` without it.
- `webapp/backend/`: Django project that serves the built frontend with
  WhiteNoise, answers client-side routes with the entry page, forwards
  `/api/*` to `api-service` and exposes `/health`. Backend prefixes (`api`,
  `auth`, `users`, `health`) and missing static files never get the frontend.
- `compose.yaml`, both Dockerfiles, `.env.example` and the smoke test. Only
  `webapp` publishes a port, on `127.0.0.1` unless `WEBAPP_BIND` says
  otherwise; the other three containers sit on internal networks.

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

- Ticket owners are not assigned or recorded in #3.
- Branch protection on `main` is not enabled and needs a repository admin.
  The checks to require: `frontend`, `api-service`, `webapp`, `compose`,
  `conventions`.
- The demo deployment is opt-in and off: `PAGES_ENABLED` is not set.
- This machine has Docker, Node 26 and Python 3.14. Its origin uses HTTPS
  through the `gh` credential helper, because the SSH agent is not reachable
  from assistant shells.

## Development setup

Full system: copy `.env.example` to `.env`, then
`docker compose up --build --wait` and open port 8000. Frontend only: Node 26
/ npm 11, in `webapp/frontend` run `npm ci`, `npm run dev` or `npm run check`.
Service tests: see "Development checks" in the README.

## Attribution and existing clones

Main history was rewritten earlier on 2026-11-15 to remove AI co-author
trailers from 13 commits while preserving file trees and human authorship.
Older clones must resynchronize with the current history; do not merge the
pre-cleanup history back. `.claude/settings.json` disables automatic AI
attribution; use the configured human Git identity.

## Next step

1. The user reviews and merges PR #40. Tickets may already stack on it.
2. Confirm or correct the two decisions above before #5.
3. Switch the session to Fable 5.2 and run `/ticket-loop 5` as the first
   supervised run.
