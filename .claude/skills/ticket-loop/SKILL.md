---
name: ticket-loop
description: Run Okane's approved tickets autonomously as stacked pull requests, from build through browser QA and review.
disable-model-invocation: true
argument-hint: "[issue numbers to limit the run, or empty for every ready ticket]"
---

You are the orchestrator. Workers build, gates judge, you decide, and the user merges.
Run this in a session on the most capable model; workers and gates run on the cheaper models their agent files name.
Invoking this skill is the user's request to implement the tickets in scope, as `AGENTS.md` requires.

## Stacking

Work continues without waiting for merges: each ticket's PR is based on the branch of its blockers' open PRs.

- A **cleared** PR has passed every gate below. Only cleared PRs carry stacks.
- A ticket's **base** is `main` when all its blockers are closed.
  Otherwise it is the cleared PR branch that already contains every unmerged blocker (`git merge-base --is-ancestor`).
  When no single branch contains them all, the ticket waits for the user to merge.
- The groundwork branch `chore/autonomous-groundwork` counts as a cleared PR until it merges; tickets start from it.

## Each round

1. **Sync.** `git fetch`, fast-forward `main`, read `HANDOFF.md`.
2. **Restack.** For each open PR whose base branch has merged, `gh pr edit <pr> --base <new base>` (usually `main`).
   Merge the new base into its branch, push, and send it back through gate a.
3. **Pick ready tickets.** Open issues labeled `ready-for-agent` without a PR, limited to `$ARGUMENTS` when given, that have a base.
   Read blockers with `gh api graphql -f query='{repository(owner:"Wcno",name:"okane"){issue(number:N){blockedBy(first:20){nodes{number state}}}}}'`.
   Prefer tickets that touch different areas. Keep at most 3 workers in flight.
   When nothing has a base and nothing is in flight, the run is finished.
4. **Build.** Spawn one `ticket-worker` per ticket with `isolation: "worktree"`, prompt `Implement issue #<n> on base <branch>.`
5. **Gate each PR as its worker reports**, in order. A gate that goes red sends the findings back to that worker with `SendMessage`, and the PR re-enters at gate a.
   - a. **CI**: `gh pr checks <pr> --watch`. All of `frontend`, `api-service`, `webapp`, `compose` and `conventions` pass.
   - b. **Browser QA**: spawn `ui-qa` with the PR number and the stack URL from the worker's report. One `ui-qa` at a time, since they share Chrome. It returns `PASS`.
   - c. **Review**: run the `mattpocock-skills:code-review` skill on the PR branch against its base, for the standards and spec axes. No finding left that breaks a contract, a criterion or `docs/code-language.md`.
   - d. **Your read**: the diff stays inside the ticket, every acceptance criterion is ticked with a test, and the PR body is accurate.
6. **Clear.** Comment on the PR with the gate results and its place in the stack (`Stacked on #<base pr>`, merge that first), then mark it ready with `gh pr ready <pr>`.
   Keep its worktree stack running only while a later gate needs it; then `docker compose down --volumes` and remove the worktree.
7. **Checkpoint.** Update `HANDOFF.md` on the groundwork branch until it merges, then on a `docs/handoff-<date>` branch with its own PR.
   Record the stack as a tree of PRs in merge order, tickets in flight, and the next ready set.

## Stop and ask the user

- A worker reports an ambiguous spec or a contract change.
- A PR goes red at the same gate 3 times.
- A restack has merge conflicts outside the ticket's own files.
- `ui-qa` reports `BLOCKED`.

Then write the blocker into `HANDOFF.md`, leave the PR open as a draft, and keep the other tickets moving.
