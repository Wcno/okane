# Okane handoff

Updated: 2026-11-15, America/Panama. Assistant: Codex.

## Current scope

**Preparation is complete. Implementation is awaiting the team's decision.**
The user requested a Spanish public interface, English source code, an updated
main branch and README, a spec-first ticket plan, closed preparation PRs and
cleanup of completed branches. Do not start issues #4–#25 until the team has
reviewed the plan and explicitly authorized implementation.

## Verified repository state

- Current branch: `main`, synchronized with `origin/main`.
- Preparation merge: `c04aac908dd4cb07f26cdae22d19dd040f0b39ad` (PR #28).
  Checkpoint-only commits may follow; use git status and log for the current tip.
- PRs #1, #2, #26, #27 and #28 are merged and closed. Their original commits
  are preserved in main. No pull requests remained open at final verification.
- Completed preparation branches were removed locally and remotely after
  verifying ancestry. Only main remains locally and on origin.
- Dependabot PR #29, proposing Node 26 types for a Node 24 runtime, was closed
  without merging. The bot branch is gone; the development configuration keeps
  the type definitions on the supported Node major.
- New local commits use the configured user identity. GitHub merge commits are
  authored by the repository owner, Wifredo Cano / Wcno.

## Specification and team review

- `docs/spec.md` is the versioned specification: 64 user stories.
- Issue #3 indexes that specification and its 22 implementation sub-issues,
  #4–#25. All 23 issues remain open with `needs-team-review` and without
  `ready-for-agent`; no implementation ticket was completed.
- `docs/matrices.md` preserves all 48 cases: 28 original, 14 N2 and 6 N3.
  Original routes and endpoints were preserved.
- `docs/plan-de-trabajo.md` gives a valid implementation order. Its 30 native
  GitHub blocking relationships were created, verified and retained.
- `docs/contratos.md` records testable financial, identity, precision and retry
  rules. ADR 0004 is proposed for team review, not an approved implementation.
- `docs/team-review.md` is the review agenda. The workflow is spec -> tickets ->
  team review -> explicit start decision -> implementation.

## Current development setup

- Existing frontend demonstration only: React, TypeScript, Tailwind and Vite.
  It uses in-memory sample data; backend services and Docker Compose are still
  planned rather than implemented.
- Public copy and accessibility labels remain Spanish. Source names, source
  filenames, comments and test descriptions are English. See `docs/code-language.md`.
- Node 24 and npm 11. From `webapp/frontend`, run `npm ci`, then `npm run dev`.
  `npm run check` runs types, lint, tests and the production build.
- README, EditorConfig, LF attributes, PR template and development workflow are
  updated. The pre-existing machine-specific `.codex/hooks.json` is preserved
  locally and ignored. AGENTS.md and CLAUDE.md share continuity instructions.

## Validation

- Local full checks passed after integration reconciliation: TypeScript, lint
  without warnings, all 19 existing tests and the production build.
- AST audit preserved all 395 unique protected presentation fragments and found
  English source identifiers. The versioned spec retains 64 stories; the
  dependency graph is acyclic and local document links were checked.
- Main preparation CI succeeded:
  https://github.com/Wcno/okane/actions/runs/43737106013
  The frontend job passed; conventions is PR-only and demo deployment stayed
  skipped. Check GitHub for the run on any later checkpoint-only commit.
- The main tree matched the validated preparation branch before this final
  checkpoint. No backend code, migrations or Docker implementation were added.

## Next step

Attribution maintenance is in progress at the user's explicit request. Thirteen
older commits include Claude co-author trailers; their primary author is the
user. A complete local Git bundle was verified under the user's Codex backups
directory before any change. Shared Claude settings and project instructions
now omit assistant attribution. Remove the AI trailers while preserving trees,
authors, dates and the parent graph; publish with a lease on the original
remote main tip `785d3bb6b605378e9de9cd0aa0a50da416648f9f`. Update pinned issue
links and this checkpoint using the saved commit map after the rewrite.

Review `docs/team-review.md`, `docs/spec.md`, the proposed ADR and the ticket
chronology with the team. Record the decision in issue #3, update the spec and
then affected tickets if needed. Only after explicit approval should a new
implementation branch be created; #4 is the first technical ticket at that time.
