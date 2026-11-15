# Okane handoff

Updated: 2026-11-15, America/Panama. Assistant: Claude Code.

## Current scope

**The team approved the plan; implementation has not started.** The owner
reported the approval of the issues on 2026-11-15 and asked to record it, to
keep everything on `main`, to clean up other branches and to implement nothing
for now. Keep the public UI in Spanish and source code in English. Start a
ticket only when the user asks for it and its blockers are closed.

## Completed in this revision

- Integrated the spec review pass through pull request #33: access, session
  and usage limits, pagination bounds, interface quality checks and the
  13-ticket minimum path for the 28 course cases.
- Recorded the team's approval in `docs/spec.md`, `docs/contratos.md`,
  `docs/plan-de-trabajo.md`, `docs/team-review.md`, `README.md` and
  `AGENTS.md`. ADRs 0004 and 0005 moved from proposed to accepted.
- Relabeled issue #3 and the 25 tickets (#4–#25, #30–#32) from
  `needs-team-review` to `ready-for-agent`, updated their status paragraph and
  left a decision comment on #3. All remain open; none is started.
- Counts are unchanged: 76 stories, 58 cases (28 A5, 24 N2, 6 N3), 25 tickets
  and 46 native dependencies.

## Still open

Not covered by the approval and listed in `docs/team-review.md`:

- Ticket owners are not assigned or recorded in #3.
- Backend/runtime versions and the internal `webapp` to `api-service`
  authentication mechanism for #4/#5.
- Branch protection on `main` is not enabled.
- The demo deployment is opt-in and off: `PAGES_ENABLED` is not set.

## Repository and validation

- Only `main` exists, locally and on origin. No open pull requests.
- Documentation only. No application code, frontend behavior or runtime
  configuration changed, and no feature tests were run or claimed.
- CI (`frontend`, `conventions`) passes on the pull requests and on `main`.
- Commits use the configured human Git identity, with no AI co-author
  trailers or generated-by footers.

## Development setup

Only the frontend demonstration exists, with in-memory fixtures. Backend
services, databases and Docker Compose remain planned. Node 24 / npm 11:
in webapp/frontend run npm ci, npm run dev, or npm run check.

## Attribution and existing clones

Main history was rewritten earlier on 2026-11-15 to remove AI co-author
trailers from 13 commits while preserving file trees and human authorship.
Older clones must resynchronize with the current history; do not merge the
pre-cleanup history back. `.claude/settings.json` disables automatic AI
attribution; use the configured human Git identity.

## Next step

1. Assign owners and settle the open points above; record them in #3.
2. When the user asks to start, begin with #4, the only ticket without
   blockers.
