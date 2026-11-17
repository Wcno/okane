# Okane handoff

Updated: 2026-11-16, America/Panama. Assistant: Claude Code (Opus 5.5, orchestrator).

## Objective

Build the "Connected Panel" vertical slice as one linear stack of PRs, for the user to review the UI:
`#8 → #15 → #17 → #9 → #18`.
#18 needs both #9 and #15, so all five sit in one chain.
The user merges, bottom first.
Partners are not on any of these tickets (confirmed by the user 2026-11-16).

## How the run works

- The orchestrator runs on Opus.
  `ticket-worker` runs on Sonnet, passed as `model: "sonnet"` on each spawn because `.claude/agents/ticket-worker.md` still says `opus`.
  `ui-qa` runs on Sonnet.
- Each PR passes CI, `ui-qa`, the two-axis `mattpocock-skills:code-review` and the orchestrator's diff read before the next ticket stacks on it.
- The user's main concern is the UI; they trust the backend.
  Pause after #8 for the user's UI sign-off, since #15, #17 and #9 reuse its list and form patterns.
- Workers stop and report before editing `docs/contratos.md`, `docs/spec.md`, `docs/matrices.md` or adding an endpoint missing from `docs/matrices.md`.

## Decisions for #8 (user, 2026-11-16)

- Approved contract additions: `GET /api/expenses/{id}` and an additive `last_used_account_id` in the `GET /api/expenses` envelope, documented in `docs/matrices.md` and `docs/contratos.md` in the #8 PR.
- Expenses list: day-grouped feed (Hoy / Ayer / date), newest first, "Mostrar más", no filters or totals. #15 and later lists copy it.
- Quick-register keeps the demo Restante hint until #9 ("keep it until 9 and then implement it"). #9 must replace it with real Budgets.
- Fixed Categories are integer ids 1-8 in code (Vivienda=1 ... Otros=8); #20 seeds a table with the same ids.
- Edit or delete on an archived Account is allowed while the Account is unchanged; moving into an archived or investment Account is rejected.

## State

| Ticket | Base | Branch / PR | Status |
|---|---|---|---|
| #8 Gastos | `main` | `feat/8-expenses-fixed-categories`, PR #47 (draft) | round 1: CI pass, review requested changes, browser QA blocked (no Chrome) |
| #15 Ingresos | #8 | - | waits for #8 sign-off |
| #17 Pagos recurrentes | #15 | - | waits |
| #9 Presupuestos | #17 | - | waits |
| #18 Panel | #9 | - | waits |

`main` is at `c4adc37` (#5, #6, #7 merged).
No other PR is open.

## Follow-ups outside any ticket

- Focus ring on the Menú "Cerrar sesión" row has square corners inside the rounded card.
- A `webapp` gunicorn sync worker timed out on an idle connection during QA (`WORKER TIMEOUT`).
- `docs/team-review.md:36` still asks the team to confirm runtime versions and the service key; the user confirmed both on 2026-11-16.
- Stray remote branch `chore/autonomous-groundwork`; stale local branches `feat/5-session-auth`, `chore/ticket-skills`.
  Ask before deleting.
- Branch protection on `main` is not enabled and needs a repository admin.

## Next step

1. PR #47 round 1 is fully applied (commits `933eabe`, `ed1f5f1`, `22dc77b`, PR body updated). Worker's local gates: api-service 101 tests, frontend 124, e2e 102, smoke test, all green.
   Rerun CI on the new head and read the delta yourself; no new worker is needed unless a gate goes red.
2. The user restarted the session to connect Claude in Chrome. Run `ui-qa` (gate b) on PR #47 against a running stack of the branch.
   The worker stack was on http://localhost:8001 (project `okane-feat-8-expenses`, worktree `.claude/worktrees/feat-8-expenses`); if it is gone, run `bash scripts/worktree-stack.sh` and `docker compose up --build --detach --wait` in that worktree.
   Ask `ui-qa` whether the populated list needs its own "Nuevo gasto" button (the worker removed it because the shell has "Registrar gasto").
3. Rerun CI and read the delta yourself, comment gate results, `gh pr ready 47`.
4. Rebuild port 8000 from the PR branch (`docker compose up --build --detach --wait`, `scripts/smoke-test.sh`) and stop for the user's UI sign-off before #15.
