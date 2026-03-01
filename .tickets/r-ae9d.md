---
id: r-ae9d
status: closed
deps: []
links: []
created: 2026-03-01T11:45:19Z
type: task
priority: 2
assignee: t1-convergence
tags: [team]
---
# Working directory: /Users/alexander/Projects/ramboard/.worktrees/t1-convergence

You are consolidating duplicated constants and logic. 5 tasks, all convergence fixes.

Read AGENTS.md first. Then read each file you'll modify BEFORE editing.

## T1-04: Fix STATUS_LABELS duplication
- `src/lib/types.ts` has the canonical `STATUS_LABELS` export.
- `src/components/status-dot.tsx` has a private copy (same values).
- Delete the private copy from `status-dot.tsx`, import from `@/lib/types`.

## T1-06: Consolidate SORT_FIELD_OPTIONS / SORT_FIELDS
- `src/components/board-view.tsx` defines `SORT_FIELD_OPTIONS` (array of {value, label} objects).
- `src/components/column-editor.tsx` defines `SORT_FIELDS` (identical array, different name).
- Create a single canonical `SORT_FIELD_OPTIONS` export in `src/lib/types.ts`.
- Update both `board-view.tsx` and `column-editor.tsx` to import from `@/lib/types`.
- Delete the local definitions from both files.

## T1-07: Move `getDefaultValue` from filter-store to filter-engine
- `src/stores/filter-store.ts` exports `getDefaultValue()` — a pure function with zero store dependency.
- Move it to `src/lib/filter-engine.ts` (where pure filter logic lives).
- Update the import in `src/components/column-editor.tsx` to point to `@/lib/filter-engine`.
- Remove from filter-store.ts exports.

## T1-08: Consolidate STATUS_CYCLE
- `src/lib/list-interaction.ts` defines `STATUS_CYCLE` as a Map (line ~27-30).
- `src/components/ticket-detail.tsx` has the same cycle logic as a ternary chain (line ~50-52).
- Create a canonical `STATUS_CYCLE` constant (or `nextStatus()` function) in `src/lib/types.ts`.
- Update both `list-interaction.ts` and `ticket-detail.tsx` to import and use it.
- Delete the local definitions.

## T1-09: Extract `normalizeTag()` to tag-mutations.ts
- `src/components/tag-editor.tsx` has inline tag normalization: `trim().toLowerCase().replace(/\s+/g, '-')` (around line 59).
- Add a `normalizeTag(tag: string): string` function to `src/lib/tag-mutations.ts`.
- Update `tag-editor.tsx` to import and use `normalizeTag()`.

After all 5:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t1-convergence && npx tsc --noEmit` — must pass with zero errors
2. Commit: `git add -A && git commit -m 'refactor: consolidate duplicated constants and logic (STATUS_LABELS, SORT_FIELDS, STATUS_CYCLE, getDefaultValue, normalizeTag)'`
3. Report what you did with file-level detail.

Working directory: /Users/alexander/Projects/ramboard/.worktrees/t1-convergence

You are consolidating duplicated constants and logic. 5 tasks, all convergence fixes.

Read AGENTS.md first. Then read each file you'll modify BEFORE editing.

## T1-04: Fix STATUS_LABELS duplication
- `src/lib/types.ts` has the canonical `STATUS_LABELS` export.
- `src/components/status-dot.tsx` has a private copy (same values).
- Delete the private copy from `status-dot.tsx`, import from `@/lib/types`.

## T1-06: Consolidate SORT_FIELD_OPTIONS / SORT_FIELDS
- `src/components/board-view.tsx` defines `SORT_FIELD_OPTIONS` (array of {value, label} objects).
- `src/components/column-editor.tsx` defines `SORT_FIELDS` (identical array, different name).
- Create a single canonical `SORT_FIELD_OPTIONS` export in `src/lib/types.ts`.
- Update both `board-view.tsx` and `column-editor.tsx` to import from `@/lib/types`.
- Delete the local definitions from both files.

## T1-07: Move `getDefaultValue` from filter-store to filter-engine
- `src/stores/filter-store.ts` exports `getDefaultValue()` — a pure function with zero store dependency.
- Move it to `src/lib/filter-engine.ts` (where pure filter logic lives).
- Update the import in `src/components/column-editor.tsx` to point to `@/lib/filter-engine`.
- Remove from filter-store.ts exports.

## T1-08: Consolidate STATUS_CYCLE
- `src/lib/list-interaction.ts` defines `STATUS_CYCLE` as a Map (line ~27-30).
- `src/components/ticket-detail.tsx` has the same cycle logic as a ternary chain (line ~50-52).
- Create a canonical `STATUS_CYCLE` constant (or `nextStatus()` function) in `src/lib/types.ts`.
- Update both `list-interaction.ts` and `ticket-detail.tsx` to import and use it.
- Delete the local definitions.

## T1-09: Extract `normalizeTag()` to tag-mutations.ts
- `src/components/tag-editor.tsx` has inline tag normalization: `trim().toLowerCase().replace(/\s+/g, '-')` (around line 59).
- Add a `normalizeTag(tag: string): string` function to `src/lib/tag-mutations.ts`.
- Update `tag-editor.tsx` to import and use `normalizeTag()`.

After all 5:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t1-convergence && npx tsc --noEmit` — must pass with zero errors
2. Commit: `git add -A && git commit -m 'refactor: consolidate duplicated constants and logic (STATUS_LABELS, SORT_FIELDS, STATUS_CYCLE, getDefaultValue, normalizeTag)'`
3. Report what you did with file-level detail.


## Notes

**2026-03-01T11:46:46Z**

Starting work. Read all files. Plan:
- T1-04: Remove STATUS_LABELS from status-dot.tsx, import from @/lib/types
- T1-06: Add SORT_FIELD_OPTIONS to types.ts, update board-view + column-editor
- T1-07: Move getDefaultValue to filter-engine.ts, update filter-store + column-editor imports
- T1-08: Add STATUS_CYCLE/nextStatus() to types.ts, update list-interaction + ticket-detail
- T1-09: Add normalizeTag() to tag-mutations.ts, update tag-editor

**2026-03-01T11:48:59Z**

DONE: All 5 convergence tasks complete.

T1-04: Removed private STATUS_LABELS from status-dot.tsx. Added import from @/lib/types.

T1-06: Added canonical SORT_FIELD_OPTIONS export to src/lib/types.ts. Removed local SORT_FIELD_OPTIONS from board-view.tsx (updated import). Removed local SORT_FIELDS from column-editor.tsx, imported SORT_FIELD_OPTIONS from @/lib/types, updated usage.

T1-07: Moved getDefaultValue() to src/lib/filter-engine.ts. Removed export from filter-store.ts and added import of getDefaultValue from @/lib/filter-engine. Updated column-editor.tsx import from @/stores/filter-store → @/lib/filter-engine.

T1-08: Added STATUS_CYCLE and nextStatus() to src/lib/types.ts. Removed local STATUS_CYCLE from list-interaction.ts and imported from ./types. Replaced ternary chain in ticket-detail.tsx with nextStatus(activeTicket.status).

T1-09: Added normalizeTag() to src/lib/tag-mutations.ts. Updated tag-editor.tsx to import and use normalizeTag() in both handleCreate() and the preview label.

Verification: npx tsc --noEmit shows zero src/ errors (4 pre-existing Bun type errors in server/ unchanged). Committed as b5c99f7.

**2026-03-01T11:49:09Z**

DONE: Task completed.
