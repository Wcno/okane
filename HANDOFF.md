# Okane handoff

Updated: 2026-11-15, America/Panama. Assistant: Codex.

## Current user instruction

Prepare and clarify the project for team review. Keep the public UI in Spanish
and source code in English. Update main and README, finish and merge the
preparation PRs, then delete branches whose work is preserved. Do not implement
issues #4–#25. The team will decide whether to start that plan.

## Verified work

- Working branch: `chore/prepare-team-review`, based on `docs/revision-specs`.
  It includes the existing demo delivery configuration from `ci/despliegue-demo`.
- Review commit `cad5e477ca333149267ebd22f44854490bd6faa1` is published in PR #27.
  The specification and all 22 ticket bodies were updated; all 30 native
  GitHub blocking relationships were created and verified.
- Preserved 64 user stories, 48 use cases (28 A5, 14 N2, 6 N3), original routes
  and endpoints. Added numerical contracts and proposed ADR 0004.
- Current source cleanup uses English names, filenames, comments and test
  descriptions. Spanish product copy and demo values are preserved.
- Split context/helpers out of component modules and removed the four previous
  lint warnings. This is preparation of the existing demo, not backend work.
- Added a versioned `docs/spec.md`, code-language policy, team review agenda,
  development checks, engine ranges, EditorConfig and a rewritten README.
- Preparation source and documents are published at commit
  `c350ac5fc11eac8cee4d2897ab4bc6e1a17cbea1` in PR #28.
- Issue #3 is now the review index for the versioned specification. It and all
  22 implementation tickets remain open with `needs-team-review`; the old
  `ready-for-agent` label was removed. The 30 technical dependencies are intact.

## Validation

- `npm run check --prefix webapp/frontend`: types, lint, all 19 tests and build
  passed locally. Lint has no warnings.
- AST audit: English identifiers, all 395 unique protected copy fragments still
  present, 64 stories, acyclic dependency plan and 44 local links verified.
- Both PR #27 and the initial PR #28 run passed CI. Verify the latest head and
  checks before each merge, including this checkpoint-only update.

## Work still in progress

The preparation changes are committed and published. AGENTS.md, CLAUDE.md and
HANDOFF.md are shared. The pre-existing local `.codex/hooks.json` is
machine-specific, ignored and preserved unchanged. Integration and completed
branch cleanup are still pending; keep every implementation issue open.

## Next steps

1. Publish this checkpoint using the configured user identity.
2. Verify checks, merge #1, then retarget and merge #2, #26, #27 and #28
   preparation PR into main. Update the PR descriptions to their final scope.
3. Verify main contains every branch tip before deleting completed local and
   remote branches. Return the checkout to main and verify its CI.
4. Replace this checkpoint with the completed preparation status and stop for
   the team's decision. Do not start the implementation plan.

A backup of original issues, rendered issue drafts and validation reports is in
this computer's temporary `okane-spec-review-20261115` directory. Quota is not
reliably exposed here, so checkpoints are saved during work.
