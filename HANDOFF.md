# Okane handoff

Updated: 2026-11-16, America/Panama. Assistant: Claude Code.

## Current scope

Updated 2026-11-16 by Claude Code (Fable 5.2, orchestrator).
The first supervised `/ticket-loop` run, limited to #5, reopened PR #43 for one change the user asked for after trying it.
Checkpoint branch: `docs/handoff-2026-11-16`, PR #42.
PR #40 (groundwork) and PR #41 (ticket skills) are merged; `main` is at `ed97fc7`.

## Ticket loop state

Stack, in merge order:

- `main`
  - PR #43 `feat/5-session-auth` (#5 "Registro, inicio y cierre de sesión"): draft again, base `main`, head `49b5535`.

- PR #43 passed gates a to d on `49b5535` and was marked ready, then returned to draft.
- The user tried it and found every sign-out took two steps, which is not what the orchestrator had described.
- Decision (user, 2026-11-16): "Cerrar sesión" in the sidebar and Menú signs out in one click; opening `/logout` by URL still asks first.
- The worker is making that change in the recreated worktree `.claude/worktrees/agent-a81fa92779601b92c`.
- The main Compose stack on port 8000 was rebuilt from `feat/5-session-auth` at `49b5535` for the user's manual check; the main checkout is on `docs/handoff-2026-11-16`.

### Decisions the user made on the #5 worker's questions (2026-11-16)

- The `X-Okane-User-Id` sentence stays in `docs/contratos.md` in PR #43; the worker also documents `GET /auth/session` in `docs/matrices.md` and `docs/spec.md`.
- The login limit stays as built: a successful login clears the email and the address counters.
- `/logout` shows a confirmation button and signs out only on click.
- The GitHub Pages demo stays off and is not fixed in this PR.

The worker applied the `/logout` and docs changes in `60afc8a`.

## Groundwork delivered (#40, #41)

- `scripts/worktree-stack.sh` lets a git worktree run its own Compose stack beside the main checkout.
- `scripts/smoke-test.sh` works under any project name.
- `e2e/` holds Playwright tests on desktop and mobile widths; CI runs them in the `compose` job.
- `.claude/agents/ticket-worker.md` (Opus), `.claude/agents/ui-qa.md` (Sonnet) and the `/ticket-loop` runbook.
- PRs stack as a tree on their blockers' branches; the user merges them, bottom first, with merge commits.

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

## Decisions taken for the team

Taken while building #4 and confirmed by the user on 2026-11-16; #5 builds on them.
They are recorded in `docs/team-review.md`.

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

1. When the worker reports, rerun gates a to d on PR #43, including `ui-qa`, since the frontend changes.
2. Clear the PR again, tear down the worktree stack (`git worktree unlock` before removing), and rebuild the port 8000 stack from the new head so the user can check it.
3. Friction seen in this run, to fix in the runbook or agents in a small PR:
   the harness locks a worker's worktree, so removal needs `git worktree unlock` first;
   the worker should stop and report a contract edit before opening the PR instead of after;
   `ui-qa` cannot set exact viewport widths or the colour scheme in Chrome.
4. `docs/team-review.md` still says the team should confirm the runtime and service-key decisions before #5.
5. The stray remote branch `chore/autonomous-groundwork` can be deleted by the user.
