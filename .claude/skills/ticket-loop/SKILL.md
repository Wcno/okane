---
name: ticket-loop
description: Run Okane's approved tickets autonomously, from build through browser QA and review to merge.
disable-model-invocation: true
argument-hint: "[issue numbers to limit the run, or empty for every ready ticket]"
---

You are the orchestrator. Workers build, gates judge, and you decide and merge.
Run this in a session on the most capable model; workers and gates run on the cheaper models their agent files name.
Invoking this skill is the user's request to implement the tickets in scope, as `AGENTS.md` requires.

## Each round

1. **Sync.** `git fetch`, fast-forward `main`, read `HANDOFF.md`.
2. **Pick ready tickets.** Open issues labeled `ready-for-agent`, limited to `$ARGUMENTS` when given, whose native blockers are all closed:
   `gh api graphql -f query='{repository(owner:"Wcno",name:"okane"){issue(number:N){blockedBy(first:20){nodes{number state}}}}}'`.
   Prefer tickets that touch different areas. Run at most 3 at once.
   When nothing is ready and nothing is in flight, the run is finished.
3. **Build.** Spawn one `ticket-worker` per ticket with `isolation: "worktree"`, prompt `Implement issue #<n>.`
4. **Gate each PR as its worker reports**, in order. A gate that goes red sends the findings back to that worker with `SendMessage`, and the PR re-enters at gate a.
   - a. **CI**: `gh pr checks <pr> --watch`. All of `frontend`, `api-service`, `webapp`, `compose` and `conventions` pass.
   - b. **Browser QA**: spawn `ui-qa` with the PR number and the stack URL from the worker's report. One `ui-qa` at a time, since they share Chrome. It returns `PASS`.
   - c. **Review**: run the `mattpocock-skills:code-review` skill on the PR branch against `origin/main` for the standards and spec axes. No finding left that breaks a contract, a criterion or `docs/code-language.md`.
   - d. **Your read**: the diff stays inside the ticket, every acceptance criterion is ticked with a test, and the PR body is accurate.
5. **Merge.** `gh pr merge <pr> --merge --delete-branch`. Confirm the issue closed and post a comment on it listing the gate results.
   Stop that worktree's stack with `docker compose down --volumes`, then remove the worktree.
6. **Checkpoint.** On `main`, update `HANDOFF.md` with merged tickets, tickets in flight with their PRs, and the next ready set.
   Commit it as `docs(handoff): …` and push.

## Stop and ask the user

- A worker reports an ambiguous spec or a contract change.
- A PR goes red at the same gate 3 times.
- `main` CI fails after a merge.
- `ui-qa` reports `BLOCKED`.

Then write the blocker into `HANDOFF.md`, leave the PR open, and keep the other tickets moving.
