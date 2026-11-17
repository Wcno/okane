---
name: ticket-loop
description: Run Okane's approved tickets autonomously as stacked pull requests, from build through browser QA and review.
disable-model-invocation: true
argument-hint: "[issue numbers to limit the run, or empty for every ready ticket]"
---

You are the orchestrator. Workers build, gates judge, you decide, and the user merges.
Run this in a session on the most capable model; workers and gates run on the cheaper models their agent files name.
The target is 10 to 20 minutes per ticket.
Model split: Haiku builds tickets that mirror an existing pattern (Incomes mirroring Expenses) and takes mechanical fixes after a red gate (renames, copy, PR body, missing tests for existing behaviour) and restacks.
Sonnet builds tickets that set a new pattern, and reworks UI.
Pass `model` on the `Agent` call to override the worker's default.
Invoking this skill is the user's request to implement the tickets in scope, as `AGENTS.md` requires.
Every task uses the skill that fits its goal: building follows `implement` with `mattpocock-skills:tdd`, reviewing uses `mattpocock-skills:code-review`, PR bodies use `mattpocock-skills:pr`.
For a task no skill covers, such as a restack or a checkpoint, use your own judgment.

## Stacking

Work continues without waiting for merges: each ticket's PR is based on the branch of its blockers' open PRs.

- A **cleared** PR has passed every gate below. Only cleared PRs carry stacks.
- A ticket's **base** is `main` when all its blockers are closed.
  Otherwise it is the cleared PR branch that already contains every unmerged blocker (`git merge-base --is-ancestor`).
  When no single branch contains them all, the ticket waits for the user to merge.
- The groundwork branch `chore/autonomous-groundwork` counts as a cleared PR until it merges; tickets start from it.
- **Pipeline.** The next ticket may start building on a PR that is still in gates, with that PR's branch as its base.
  When the PR then changes, restack the child onto it with a Haiku worker; the child stays out of the stack of cleared PRs until it clears.

## Each round

1. **Sync.** `git fetch`, fast-forward `main`, read `HANDOFF.md`.
2. **Restack.** For each open PR whose base branch has merged, `gh pr edit <pr> --base <new base>` (usually `main`).
   Merge the new base into its branch, push, and send it back through gate a.
3. **Pick ready tickets.** Open issues labeled `ready-for-agent` without a PR, limited to `$ARGUMENTS` when given, that have a base.
   Read blockers with `gh api graphql -f query='{repository(owner:"Wcno",name:"okane"){issue(number:N){blockedBy(first:20){nodes{number state}}}}}'`.
   Prefer tickets that touch different areas. Keep at most 3 workers in flight.
   When nothing has a base and nothing is in flight, the run is finished.
4. **Build.** Spawn one `ticket-worker` per ticket with `isolation: "worktree"`, prompt `Implement issue #<n> on base <branch>.`
   A ticket with both a backend and a UI half may split into a backend worker and a frontend worker in parallel, prompts `Implement the backend of issue #<n> ...` and `Implement the frontend of issue #<n> ...`, both building against `docs/matrices.md`.
   The frontend worker stubs the API until the backend branch lands, then merges it. The ticket's PR is the frontend one, based on the backend branch.
5. **Gate each PR as its worker reports.** Run gates a to d in parallel, a alongside the others or once CI is green.
   A gate that goes red sends its findings back to that worker with `SendMessage`; a mechanical finding goes to a Haiku worker instead. The PR re-enters at the red gate.
   - a. **CI**: `gh pr checks <pr> --watch`. All of `frontend`, `api-service`, `webapp`, `compose` and `conventions` pass.
   - b. **Playwright QA**: the ticket's e2e specs pass on the worker's stack at both widths, with the QA fixture clean and every `expectScreenQuality` green; CI runs the full suite.
     Then spawn `screenshot-qa` with the PR number and the worker's `e2e/qa-screenshots` directory. It returns `PASS`.
   - c. **Review**: run the `mattpocock-skills:code-review` skill on the PR branch against its base, with the spec axis on Haiku and the standards axis on Sonnet. Workers run no review of their own, so this is the review.
     No finding left that breaks a contract, a criterion or `docs/code-language.md`.
   - d. **Your read**: the diff stays inside the ticket, every acceptance criterion is ticked with a test, and the PR body is accurate.
6. **Clear.** Comment on the PR with the gate results and its place in the stack (`Stacked on #<base pr>`, merge that first), then mark it ready with `gh pr ready <pr>`.
   Keep its worktree stack running while a child PR or the final Chrome pass needs it; then `docker compose down --volumes` and remove the worktree.
7. **Checkpoint.** Update `HANDOFF.md` on the groundwork branch until it merges, then on a `docs/handoff-<date>` branch with its own PR.
   Record the stack as a tree of PRs in merge order, tickets in flight, and the next ready set.

## Chrome polish

When the run is finished, spawn `ui-qa` once for the whole run: the PR numbers delivered, the stack URL, and the `screenshot-qa` findings with their `For Chrome` lists.
It seeds its own data with `npm run seed:qa`, walks only what screenshots cannot judge, and returns `PASS`.
A `FAIL` sends its findings to a Sonnet worker on the PR they belong to; the PR re-enters at gate b.

## Stop and ask the user

- A worker reports an ambiguous spec or a contract change.
- A PR goes red at the same gate 3 times.
- A restack has merge conflicts outside the ticket's own files.
- `ui-qa` reports `BLOCKED`.

Then write the blocker into `HANDOFF.md`, leave the PR open as a draft, and keep the other tickets moving.
