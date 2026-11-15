# Project instructions

## Current scope

The team approved the plan on 2026-11-15; the implementation issues in
`docs/plan-de-trabajo.md` are open and labeled `ready-for-agent`. Approval of
the plan is not an instruction to start: implement a ticket only when the user
asks for that ticket, and only when its blockers are closed. Retain unrelated
work and branches.

## Language

Write source code, identifiers, source filenames, comments, test descriptions
and new commit messages in English. Keep all public UI copy, accessible labels
and localized presentation data in Spanish. Follow `docs/code-language.md` for
the mapping between Spanish domain vocabulary and English code names.

## Spec before tickets before implementation

Use `docs/spec.md` as the versioned specification and issue #3 as its review
index. Keep `docs/contratos.md`, the ADRs and `docs/plan-de-trabajo.md` consistent
with it. Clarify requirements in the spec first, then update ticket acceptance
criteria and native dependencies. Documentation changes do not complete
implementation tickets.

## Handoff

At the start of a task, read `HANDOFF.md` and compare it with git status, branch
and recent commits. Verify remote facts needed for the task instead of assuming
the checkpoint is current.

Update `HANDOFF.md` after each meaningful block of changes, before responding,
when the user requests a handoff, and when quota or context warnings are exposed.
Save checkpoints during work because a quota cutoff may arrive without notice.
Record date, assistant, objective, branch, completed and ongoing work, uncommitted
files, checks and results, blockers and the next concrete step. Replace stale
status instead of accumulating conversation transcripts.

Use quota indicators only when the client actually exposes them. A handoff
provides context, not new authorization. Store credential references rather
than credential values. Use the user's configured Git identity for commits;
the user requires the commits to remain in their name.

## Attribution

Use the configured user identity for commits created with an assistant.
Omit AI co-author trailers and generated-by footers
from commit messages and PR descriptions. Preserve existing human attribution.
The shared `.claude/settings.json` disables Claude Code's automatic commit
and PR attribution for this repository.

The main history was rewritten on 2026-11-15 to remove old AI co-author
trailers while preserving file contents and human authorship. Resynchronize
older clones with the current origin history before contributing; carry over
any pending work without merging the pre-cleanup history back into main.
