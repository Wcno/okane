# Okane handoff

Updated: 2026-11-15, America/Panama. Assistant: Codex.

## Current scope

**Preparation is complete. Implementation is awaiting the team's decision.**
Keep the public interface in Spanish and source code in English. Do not start
issues #4–#25 until the team reviews the spec and explicitly authorizes the plan.
The latest request, removing Claude Code contribution attribution, is complete.

## Attribution correction

- Removed Claude co-author trailers from 13 older commits. Their human authors,
  committers, dates, file trees and parent relationships were preserved.
- Audited 28 commits: 27 IDs changed because their messages or ancestors changed.
  Every original file tree was verified unchanged during that rewrite.
- Invalid signatures on five altered commit objects were removed; the original
  signed history is retained in the verified local backup bundle.
- A complete pre-cleanup Git bundle and an old-to-new commit map are stored in
  the repository owner's local Codex backups directory for Okane.
- The rewritten main was published with a lease on the previous remote tip;
  the local checkout was synchronized without replacing working files.
- `.claude/settings.json` sets automatic commit and PR attribution to empty
  strings. AGENTS.md also keeps assistant attribution out of commits and PRs.
- Removed the generated-with-Claude footers from PRs #1, #2 and #26.
- Updated 31 pinned links across issue #3 and its 22 tickets to the mapped
  source commits. The review gates and technical dependencies were retained.
- GitHub contributor displays may take approximately 24 hours to refresh after
  a history rewrite. Older clones must be resynchronized before contributing;
  merging the pre-cleanup history back would restore the removed trailers.

## Verified repository state

- Branch: `main`, synchronized with `origin/main`; no work branches remain.
- Preparation was integrated through PRs #1, #2, #26, #27 and #28. They are
  closed. Their changes remain in main, with rewritten commit IDs as above.
- The equivalent preparation merge in the cleaned history is
  `39c1417122876c16008311b73ac23b1e144d7da0`. Check git log for the current tip.
- Dependabot PR #29 was closed without merging because it proposed Node 26
  type definitions for the declared Node 24 runtime. Its branch is gone.

## Specification and development setup

- `docs/spec.md`: 64 user stories; issue #3 is its review index.
- All 22 implementation tickets (#4–#25) remain open with `needs-team-review`.
  Together with #3, all 23 planning issues await team review.
- `docs/matrices.md` retains the 48 cases: 28 original, 14 N2 and 6 N3.
  Original routes and endpoints remain intact.
- `docs/plan-de-trabajo.md` records the chronology and 30 native dependencies.
- `docs/contratos.md` and proposed ADR 0004 contain the decisions to review.
- Only the existing frontend demonstration is implemented. It uses in-memory
  fixtures; the backend services and Docker Compose remain planned.
- Node 24 and npm 11. In `webapp/frontend`, run `npm ci`, then `npm run dev`.
  `npm run check` runs types, lint, tests and build. Public copy is Spanish;
  source names, comments and test descriptions are English.
- README, language policy, review agenda, EditorConfig, CI and assistant
  continuity files are shared. Machine-specific local hooks remain ignored.

## Validation

- Prior full local checks passed: TypeScript, warning-free lint, 19 tests and
  production build. Product source was not changed by attribution maintenance.
- History audit verified all file trees, human identities, dates and graph
  relationships; the main commit messages contain no Claude co-author trailers.
- Claude project settings were parsed and checked. The rewritten main CI passed:
  https://github.com/Wcno/okane/actions/runs/43739550833
  Check GitHub for the run on any later checkpoint-only commit.

## Next step

Review `docs/team-review.md`, the versioned spec, proposed ADR and ticket plan
with the team. Record the decision in issue #3 and synchronize any revisions
from spec to tickets. Implementation may begin only after explicit approval;
#4 is the first technical ticket at that point.
