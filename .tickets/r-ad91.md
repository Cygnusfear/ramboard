---
id: r-ad91
status: closed
deps: []
links: []
created: 2026-03-01T11:45:19Z
type: task
priority: 2
assignee: t1-misc-fixes
tags: [team]
---
# Working directory: /Users/alexander/Projects/ramboard/.worktrees/t1-misc-fixes

You are doing 2 small independent fixes. Read AGENTS.md first. Then read each file BEFORE editing.

## T1-05: Export TICKET_ID_RE and deduplicate
- `src/lib/linkify-ticket-ids.tsx` defines `TICKET_ID_RE` (a regex for matching ticket IDs).
- `src/components/ticket-link-plugin.ts` defines the same regex identically.
- Make `TICKET_ID_RE` a named export from `src/lib/linkify-ticket-ids.tsx`.
- In `src/components/ticket-link-plugin.ts`, delete the local definition and import `TICKET_ID_RE` from `@/lib/linkify-ticket-ids`.

## T1-10: Fix urgent priority icon inconsistency
- `src/lib/ticket-options.tsx` uses `ArrowFatDown` (Phosphor icon) for urgent priority.
- `src/components/priority-icon.tsx` uses `Warning` for urgent priority.
- Read both files. Decide which icon is used more broadly / makes more sense for 'urgent'. Use `Warning` — it's the dedicated priority indicator component that renders everywhere.
- Update `src/lib/ticket-options.tsx` to use `Warning` instead of `ArrowFatDown` for the urgent priority entry. Import `Warning` if not already imported, remove `ArrowFatDown` import if no longer used.

After both:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t1-misc-fixes && npx tsc --noEmit` — must pass with zero errors
2. Commit: `git add -A && git commit -m 'fix: deduplicate TICKET_ID_RE, fix urgent priority icon inconsistency'`
3. Report what you did.

Working directory: /Users/alexander/Projects/ramboard/.worktrees/t1-misc-fixes

You are doing 2 small independent fixes. Read AGENTS.md first. Then read each file BEFORE editing.

## T1-05: Export TICKET_ID_RE and deduplicate
- `src/lib/linkify-ticket-ids.tsx` defines `TICKET_ID_RE` (a regex for matching ticket IDs).
- `src/components/ticket-link-plugin.ts` defines the same regex identically.
- Make `TICKET_ID_RE` a named export from `src/lib/linkify-ticket-ids.tsx`.
- In `src/components/ticket-link-plugin.ts`, delete the local definition and import `TICKET_ID_RE` from `@/lib/linkify-ticket-ids`.

## T1-10: Fix urgent priority icon inconsistency
- `src/lib/ticket-options.tsx` uses `ArrowFatDown` (Phosphor icon) for urgent priority.
- `src/components/priority-icon.tsx` uses `Warning` for urgent priority.
- Read both files. Decide which icon is used more broadly / makes more sense for 'urgent'. Use `Warning` — it's the dedicated priority indicator component that renders everywhere.
- Update `src/lib/ticket-options.tsx` to use `Warning` instead of `ArrowFatDown` for the urgent priority entry. Import `Warning` if not already imported, remove `ArrowFatDown` import if no longer used.

After both:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t1-misc-fixes && npx tsc --noEmit` — must pass with zero errors
2. Commit: `git add -A && git commit -m 'fix: deduplicate TICKET_ID_RE, fix urgent priority icon inconsistency'`
3. Report what you did.


## Notes

**2026-03-01T11:45:42Z**

Starting work. Reading done. Making two fixes:
1. T1-05: Export TICKET_ID_RE from linkify-ticket-ids.tsx, import it in ticket-link-plugin.ts
2. T1-10: Replace ArrowFatDown with Warning for urgent priority in ticket-options.tsx

**2026-03-01T11:47:02Z**

DONE: Both fixes applied and committed (4172da0).

T1-05: Exported TICKET_ID_RE from src/lib/linkify-ticket-ids.tsx and removed the duplicate local definition from src/components/ticket-link-plugin.ts, replacing it with an import from @/lib/linkify-ticket-ids.

T1-10: Updated src/lib/ticket-options.tsx to use Warning (from @phosphor-icons/react) instead of ArrowFatDown for the urgent (priority 0) entry, aligning it with priority-icon.tsx. Removed ArrowFatDown import, added Warning import.

TypeScript check: only pre-existing Bun type errors in server/ (unrelated to changes). No new errors introduced.

**2026-03-01T11:47:14Z**

DONE: Task completed.
