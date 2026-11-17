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
  The user dropped the #8 pause on 2026-11-16: run the whole stack through every gate, then stop once for the user's final UI review.
- Model split (user, 2026-11-16): Sonnet builds tickets, does UI rework, runs `ui-qa` and the standards review axis; Haiku takes mechanical fixes after a red gate, restacks and the spec review axis. Earlier trial idea: build #15 with `model: "haiku"` on the `ticket-worker` spawn. All gates stay the same.
  If #15 clears in 1-2 rounds, try Haiku on #9 too; #17 stays on Sonnet. If #15 goes red 3 times at the same gate, switch #15 to Sonnet and tell the user.
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
| #8 Gastos | `main` | `feat/8-expenses-fixed-categories`, PR #47 (draft) | round 2 at `22dc77b`: CI pass, ui-qa PASS with UI findings, review found gaps; round-2 worker applying 23 fixes |
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

1. PR #47 round 2 at `22dc77b`: gate a CI pass; gate b ui-qa PASS with findings; gate c review (Sonnet axes) found spec gaps and leftover duplication.
   ui-qa could not resize Chrome; it framed the app at 1440/390 through a throwaway same-origin proxy on :8002 (stopped). Recommendation adopted: no list-level "Nuevo gasto" button.
2. A fresh Sonnet `ticket-worker` is applying 23 numbered fixes in `.claude/worktrees/feat-8-expenses` (same branch, stack :8001):
   UI (clear errors on change, sticky submit in the 390 quick sheet, rows become one link with delete on the edit screen for Expenses and Accounts, 44px targets, focus after "Mostrar más", chip fit, Spanish date in the opening-date error, Balance in the quick-sheet toast, matching empty-state widths),
   spec (real Expense stops mutating sample Accounts, too-large amount message, one shared amount parser, today at submit time, PR body citations),
   docs (user-approved: archived-Account edit rule, 140 chars, date required on PUT, 404 precedence in contratos/matrices),
   standards (shared submit/confirm piece, lib/dates.ts, change kind instead of verb strings, renames, duplicate copy).
3. When it reports: rerun gates a-d (ui-qa again since the UI changed), comment "Gate results, round 2", `gh pr ready 47`.
4. Then build #15 on base `feat/8-expenses-fixed-categories` (Sonnet), and continue #17, #9, #18 the same way. Stop for the user's final UI review after #18 clears, with port 8000 rebuilt from the top of the stack.
