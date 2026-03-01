---
id: r-24cd
status: closed
deps: []
links: []
created: 2026-03-01T11:45:18Z
type: task
priority: 2
assignee: t1-dead-code
tags: [team]
---
# Working directory: /Users/alexander/Projects/ramboard/.worktrees/t1-dead-code

You are doing mechanical cleanup. 3 tasks, all pure deletions. Zero risk.

Read AGENTS.md first. Then:

## T1-01: Delete `src/lib/drag-select.ts`
- This file is 131 lines, zero imports anywhere in the codebase. It was superseded by `list-interaction.ts`.
- Just `rm src/lib/drag-select.ts`

## T1-02: Delete dead serialization functions from `src/lib/filter-engine.ts`
- Remove the `serializeFilters` and `deserializeFilters` functions (and their exports). Zero import sites.
- These were superseded by `use-filter-url-sync.ts` which uses a different strategy.
- Do NOT touch any other functions in this file.

## T1-03: Delete planning artifact `src/components/ticket-detail-edit.plan.md`
- This is a planning file accidentally committed to source. Just delete it.

After all 3:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t1-dead-code && npx tsc --noEmit` — must pass with zero errors
2. Commit: `git add -A && git commit -m 'chore: delete dead code (drag-select, serialize fns, plan.md)'`
3. Report what you did.

Working directory: /Users/alexander/Projects/ramboard/.worktrees/t1-dead-code

You are doing mechanical cleanup. 3 tasks, all pure deletions. Zero risk.

Read AGENTS.md first. Then:

## T1-01: Delete `src/lib/drag-select.ts`
- This file is 131 lines, zero imports anywhere in the codebase. It was superseded by `list-interaction.ts`.
- Just `rm src/lib/drag-select.ts`

## T1-02: Delete dead serialization functions from `src/lib/filter-engine.ts`
- Remove the `serializeFilters` and `deserializeFilters` functions (and their exports). Zero import sites.
- These were superseded by `use-filter-url-sync.ts` which uses a different strategy.
- Do NOT touch any other functions in this file.

## T1-03: Delete planning artifact `src/components/ticket-detail-edit.plan.md`
- This is a planning file accidentally committed to source. Just delete it.

After all 3:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t1-dead-code && npx tsc --noEmit` — must pass with zero errors
2. Commit: `git add -A && git commit -m 'chore: delete dead code (drag-select, serialize fns, plan.md)'`
3. Report what you did.


## Notes

**2026-03-01T11:45:48Z**

Starting work. Verified all 3 targets:
- drag-select.ts: 0 imports (list-interaction.ts reference is a comment only)
- serializeFilters/deserializeFilters: 0 external imports (only appear in filter-engine.ts itself)
- ticket-detail-edit.plan.md: exists, ready to delete

Executing T1-01, T1-02, T1-03 now.

**2026-03-01T11:46:50Z**

DONE: All 3 tasks completed and committed (fix/t1-dead-code @ 10df472).

T1-01: Deleted src/lib/drag-select.ts (131 lines, zero real imports — list-interaction.ts reference was a comment only).
T1-02: Removed serializeFilters and deserializeFilters functions + the '── Serialization ──' section header from src/lib/filter-engine.ts. Zero external import sites confirmed.
T1-03: Deleted src/components/ticket-detail-edit.plan.md (planning artifact).

TypeScript check: 4 pre-existing Bun server errors (unchanged before/after). Zero new errors introduced. Commit: chore: delete dead code (drag-select, serialize fns, plan.md)

**2026-03-01T11:47:07Z**

DONE: Task completed.
