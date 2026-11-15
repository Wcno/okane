# Okane handoff

Updated: 2026-11-15, America/Panama. Assistant: Codex.

## Current scope

**Feedback incorporated and published; implementation awaits the team's decision.**
The user requested a handoff for Claude Code. The agreed proposal is on `main`.
Keep the public UI in Spanish and source code in English. Do not implement
any ticket in `docs/plan-de-trabajo.md` until the team explicitly approves.

## Completed in this revision

- Updated spec, glossary, product context, contracts, matrices, README and review
  agenda: recurring payments reserve money until manual confirmation/cancellation;
  overdue reservations carry forward without automatically creating Expenses.
- Specified one Movements view with six record types and filters, presentation-only
  preferences, and up to three savings/investment projection scenarios.
- Specified an authenticated public API through webapp with personal tokens,
  read/create scopes and atomic retry idempotency. ADR 0005 is proposed.
  OpenAPI and the Google Apps Script example are deliverables of #32, not
  working services or integration code provided by this preparation.
- Preserved all 28 original course cases, including names, routes and endpoints.
  Scope is now 76 stories, 58 cases (28 A5, 24 N2, 6 N3) and 25 implementation tickets.
- Created #30 Movements, #31 visual preferences and #32 public API.
  Updated #10/#17 and affected acceptance criteria; refreshed contract links
  across existing tickets to the current version on main.
- Updated #3 and linked all 25 native sub-issues. All remain open with
  `needs-team-review`. The 46 native dependencies match the chronological plan;
  #10 now waits for investment valuation in #13, and #19 covers the new flows.
- Updated AGENTS.md to refer to the full plan rather than a fixed issue range.
  No application code, frontend behavior or runtime configuration changed.

## Repository and validation

- Working branch: `main`. The feedback documentation commit is
  `25520164017cd14a4b933b9c53b637d9648c0ee9`, pushed to `origin/main`.
  At handoff preparation, the local checkout was synchronized and clean.
- Preparation PRs #1, #2, #26, #27 and #28 were merged earlier. #29 was closed
  without merging; no implementation PR is opened by this documentation revision.
- Structural checks passed: 76 sequential stories, 58 cases in both interface
  and traceability matrices, all original A5 rows preserved, local Markdown
  links valid, UTF-8 text valid and git diff --check clean.
- GitHub read-back verified 25 open review-gated sub-issues, updated acceptance
  bodies and all 46 native dependency edges against the cycle-free plan.
- Changes are documentation only. No new feature tests were run or claimed.
  Prior frontend checks passed types, warning-free lint, 19 tests and build;
  those files are unchanged. CI for `2552016` passed types, lint, tests and build:
  https://github.com/Wcno/okane/actions/runs/43753351320
- No open PRs remained when this handoff was prepared. All 25 implementation
  tickets and review index #3 were open with `needs-team-review`.

## Development setup

Only the frontend demonstration exists, with in-memory fixtures. Backend services,
databases and Docker Compose remain planned. Node 24 / npm 11:
in webapp/frontend run npm ci, npm run dev, or npm run check.

## Attribution and existing clones

Main history was rewritten earlier on 2026-11-15 to remove Claude co-author
trailers from 13 commits while preserving file trees and human authorship.
The verified original Git bundle and commit map remain in the owner's local
Codex backup directory for Okane. Older clones must resynchronize with the
current history; do not merge the pre-cleanup history back.
.claude/settings.json disables automatic AI attribution; use the configured
human Git identity and omit AI co-author trailers and generated-by footers.

## Claude Code pickup

1. `CLAUDE.md` imports `AGENTS.md`. Read both instructions and this handoff,
   then check `git status --short --branch`, `git log -1 --oneline` and
   `git ls-remote origin refs/heads/main` before making changes. A handoff is
   context, not approval to implement pending tickets.
2. Review `docs/team-review.md`, `docs/spec.md`, `docs/contratos.md`,
   `docs/matrices.md`, `docs/plan-de-trabajo.md`, ADRs 0004/0005 and issue #3.
   The latest feedback appears in tickets #10, #17 and #30–#32.
3. If the team provides revisions, update the versioned spec first, then
   contracts/matrices and ticket criteria/dependencies. Keep the review gate
   until the team's start decision is recorded in #3.
4. Preserve the configured human Git identity and `.claude/settings.json`
   attribution setting. If the checkout predates the history rewrite, sync it
   with current origin without reintroducing old commits.

## Next step

Review docs/team-review.md, docs/spec.md, contracts, proposed ADRs 0004/0005
and the 25-ticket plan with the team. Record the decision and owners in #3.
Any revision follows spec → tickets → review; #4 is the first technical
ticket only after explicit authorization. No unresolved blocker for this
documentation delivery; implementation authorization remains pending.
