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
| #8 Gastos | `main` | `feat/8-expenses-fixed-categories`, PR #47 | CLEARED at `8d26934`, ready for the user to merge |
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

## Run plan (user, 2026-11-16 evening)

Full app tonight, about 2.5 hours. Sonnet for builds and judgment work, Haiku for mechanical fixes, restacks and the spec review axis.
New gates: CI, Playwright QA (1440/390, console/overflow/axe, screenshots read by `screenshot-qa`), two-axis review and the orchestrator's read on every PR. Chrome `ui-qa` every 3 cleared PRs and on the last PR of a slice. Pipelining allowed.
One final UI review by the user at the end.

Dependency graph of open tickets:
- Budgets lane: #8 -> #17 -> #9 -> #20 -> #25; #18 needs #15 and #9.
- Investments lane: #11 -> #12; #13 needs #16 and #11; #10 and #23 need #13; #22 needs #13 and #12; #24 needs #23, #22 and #18.
- Late: #21 (#16 #15 #12 #8), #30 (#22 #16 #15 #12 #8), #31 (#14 #18 #30), #32 (#14 #30 #9), #19 last (#32 #31 #10 #13 #18).
- Multi-blocker tickets base on one blocker's branch and merge the others in.

## Speed rules (user, 2026-11-16)

Target 10-20 min per ticket: workers skip self-review; split backend and frontend workers per ticket; targeted tests only (CI runs full suites); Haiku for mirror tickets; Docker rebuild only on migrations or Docker changes; reports under 150 words. Chrome `ui-qa` once at run end, seeded and cheap.

## Contract decisions (user, 2026-11-16 evening)

- Ingresos follow the Gastos rules (archived-Account edits, 404 precedence), documented in #52.
- #17: additive read-only `recurring_payment_occurrence_id` on the Expense JSON so edit/delete screens warn (contratos.md 169-171).

- #16: additive `net_contribution` on GET /api/accounts approved; documented in the #16 PR.

- Blanket yes: any ticket may add a read-one `GET /api/<resource>/{id}` mirroring #8, documented in matrices.md and contratos.md in its own PR. Any other contract change still asks.
- #14: `DELETE /internal/users/me` on api-service, outside /api/, service-key auth, idempotent with a deleting lock (writes answer 409); webapp deletes the User only after a confirmed 204, else answers 502 and keeps the User. Documented in the #14 PR.

## Next step

DONE: all 21 tickets built and every PR cleared and ready (#47-#68). The user merges bottom-up; see each PR's "Stacked on" line.
Port 8000 serves the integrated app (#68, feat/19-e2e-journeys at 0a15767) from worktree `.claude/worktrees/agent-a9c3d77fb4b426f96`, seeded; the test login is in that worktree's `e2e/.qa-user.json`. The main-branch stack `okane` is stopped with its volumes kept.
Next: the user's final UI review on port 8000.

Open decisions for the user:
- `conventions` CI fails on `wip:`/`merge:` commit subjects in several branches: reword the stack before merging, or relax the check.
- docs/spec.md:175, 181, 231, 246 still describe the fixed catalog and sample data.
- docs/contratos.md lists `description` as a common public-API field, but investment writes have none (400).
- Archived Categories are read-only (restoring needs a contract change).
- Real prices need TWELVE_DATA_API_KEY; compose defaults QUOTES_PROVIDER to sample.
