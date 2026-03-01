---
id: r-2d2d
status: closed
deps: []
links: []
created: 2026-03-01T12:05:08Z
type: task
priority: 2
assignee: t2-keyboard
tags: [team]
---
# Working directory: /Users/alexander/Projects/ramboard/.worktrees/t2-keyboard

Read AGENTS.md first. Then read each file you modify BEFORE editing.

You have 2 tasks that both touch `src/hooks/use-keyboard.ts`.

## T2-01: Fix broken 'v' keyboard shortcut + delete dead UIStore viewMode

The 'v' key is silently broken. It calls `ui.toggleViewMode()` which writes to `useUIStore.viewMode` — but NOTHING reads UIStore.viewMode for rendering. The actual view mode comes from `useViewStore` (via `activeView?.mode`).

### How view switching ACTUALLY works (see header-bar.tsx lines ~90-102):
```typescript
const activeView = views.find(v => v.id === activeViewId)
const viewMode = activeView?.mode ?? 'list'

const handleModeToggle = (values: string[]) => {
  const targetMode = values[0] as 'list' | 'board' | 'graph'
  if (targetMode === viewMode) return
  const target = views.find(v => v.mode === targetMode)
  if (target) {
    switchView(target.id)  // calls setActiveView + navigate
  } else if (activeView) {
    useViewStore.getState().updateViewLocal(activeView.id, { mode: targetMode })
  }
}
```

### What to do:
1. In `src/hooks/use-keyboard.ts`:
   - Add `import { useViewStore } from '@/stores/view-store'`
   - Replace the `case 'v':` block. Instead of `ui.toggleViewMode()`, do:
     ```typescript
     case 'v': {
       e.preventDefault()
       const viewStore = useViewStore.getState()
       const activeView = viewStore.views.find(v => v.id === viewStore.activeViewId)
       const currentMode = activeView?.mode ?? 'list'
       const targetMode = currentMode === 'list' ? 'board' : 'list'
       const target = viewStore.views.find(v => v.mode === targetMode)
       if (target) {
         viewStore.setActiveView(target.id)
       } else if (activeView) {
         viewStore.updateViewLocal(activeView.id, { mode: targetMode })
       }
       break
     }
     ```

2. In `src/stores/ui-store.ts`:
   - Delete the `viewMode` state field
   - Delete `setViewMode` and `toggleViewMode` actions
   - Remove the `ViewMode` import from `@/lib/types` if no longer used
   - Remove `viewMode`, `setViewMode`, `toggleViewMode` from the interface

## T2-08: Implement unimplemented keybindings 'p' and 'X'

`src/lib/keybindings.ts` lists these in the help dialog, but `use-keyboard.ts` has no case for them.

### 'p' — Cycle priority:
The priority values are defined in `src/lib/types.ts`. Look at how 'o'/'i'/'c' set status — same pattern.
- Get the highlighted ticket
- Cycle its priority: 0 → 1 → 2 → 3 → 4 → 0 (or whatever the priority values are)
- Call `ticketStore.updateTicketField(projectId, ticketId, 'priority', newPriority)` — check what method exists on ticketStore for updating priority. It might be `updateTicketPriority` or a generic `updateTicketField`.
- Read `src/stores/ticket-store.ts` to find the right method.

### 'X' (Shift+X) — Range select:
- UIStore already has `rangeSelect(ids: string[], fromId: string, toId: string)`
- Get the current selection anchor (`ui.selectionAnchor`)
- Get the highlighted ticket ID
- Get the list of visible ticket IDs
- Call `ui.rangeSelect(visibleIds, anchorId, highlightedId)`
- If no anchor exists, treat it like a single toggle select

After both:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t2-keyboard && npx tsc --noEmit 2>&1 | grep -v server/`
2. Commit: `git add -A && git commit -m 'fix: wire v-shortcut to viewStore, implement p/X keybindings, delete dead UIStore.viewMode'`
3. Report what you did.

Working directory: /Users/alexander/Projects/ramboard/.worktrees/t2-keyboard

Read AGENTS.md first. Then read each file you modify BEFORE editing.

You have 2 tasks that both touch `src/hooks/use-keyboard.ts`.

## T2-01: Fix broken 'v' keyboard shortcut + delete dead UIStore viewMode

The 'v' key is silently broken. It calls `ui.toggleViewMode()` which writes to `useUIStore.viewMode` — but NOTHING reads UIStore.viewMode for rendering. The actual view mode comes from `useViewStore` (via `activeView?.mode`).

### How view switching ACTUALLY works (see header-bar.tsx lines ~90-102):
```typescript
const activeView = views.find(v => v.id === activeViewId)
const viewMode = activeView?.mode ?? 'list'

const handleModeToggle = (values: string[]) => {
  const targetMode = values[0] as 'list' | 'board' | 'graph'
  if (targetMode === viewMode) return
  const target = views.find(v => v.mode === targetMode)
  if (target) {
    switchView(target.id)  // calls setActiveView + navigate
  } else if (activeView) {
    useViewStore.getState().updateViewLocal(activeView.id, { mode: targetMode })
  }
}
```

### What to do:
1. In `src/hooks/use-keyboard.ts`:
   - Add `import { useViewStore } from '@/stores/view-store'`
   - Replace the `case 'v':` block. Instead of `ui.toggleViewMode()`, do:
     ```typescript
     case 'v': {
       e.preventDefault()
       const viewStore = useViewStore.getState()
       const activeView = viewStore.views.find(v => v.id === viewStore.activeViewId)
       const currentMode = activeView?.mode ?? 'list'
       const targetMode = currentMode === 'list' ? 'board' : 'list'
       const target = viewStore.views.find(v => v.mode === targetMode)
       if (target) {
         viewStore.setActiveView(target.id)
       } else if (activeView) {
         viewStore.updateViewLocal(activeView.id, { mode: targetMode })
       }
       break
     }
     ```

2. In `src/stores/ui-store.ts`:
   - Delete the `viewMode` state field
   - Delete `setViewMode` and `toggleViewMode` actions
   - Remove the `ViewMode` import from `@/lib/types` if no longer used
   - Remove `viewMode`, `setViewMode`, `toggleViewMode` from the interface

## T2-08: Implement unimplemented keybindings 'p' and 'X'

`src/lib/keybindings.ts` lists these in the help dialog, but `use-keyboard.ts` has no case for them.

### 'p' — Cycle priority:
The priority values are defined in `src/lib/types.ts`. Look at how 'o'/'i'/'c' set status — same pattern.
- Get the highlighted ticket
- Cycle its priority: 0 → 1 → 2 → 3 → 4 → 0 (or whatever the priority values are)
- Call `ticketStore.updateTicketField(projectId, ticketId, 'priority', newPriority)` — check what method exists on ticketStore for updating priority. It might be `updateTicketPriority` or a generic `updateTicketField`.
- Read `src/stores/ticket-store.ts` to find the right method.

### 'X' (Shift+X) — Range select:
- UIStore already has `rangeSelect(ids: string[], fromId: string, toId: string)`
- Get the current selection anchor (`ui.selectionAnchor`)
- Get the highlighted ticket ID
- Get the list of visible ticket IDs
- Call `ui.rangeSelect(visibleIds, anchorId, highlightedId)`
- If no anchor exists, treat it like a single toggle select

After both:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t2-keyboard && npx tsc --noEmit 2>&1 | grep -v server/`
2. Commit: `git add -A && git commit -m 'fix: wire v-shortcut to viewStore, implement p/X keybindings, delete dead UIStore.viewMode'`
3. Report what you did.


## Notes

**2026-03-01T12:05:54Z**

Starting implementation: T2-01 (fix 'v' shortcut, delete dead UIStore.viewMode) and T2-08 (implement 'p' cycle-priority and 'X' range-select). Priority cycles 0→1→2→3→0 per PRIORITY_LABELS in types.ts.

**2026-03-01T12:06:56Z**

DONE: T2-01 — fixed 'v' shortcut to call useViewStore.getState() directly (setActiveView or updateViewLocal) instead of dead UIStore.toggleViewMode. Deleted viewMode/setViewMode/toggleViewMode from UIStore and removed ViewMode import. T2-08 — implemented 'p' (cycle priority 0→3→0 via updateTicketPriority) and 'X' (range-select from selectionAnchor to highlighted, or single-toggle if no anchor). TypeScript clean, committed 2295aef.

**2026-03-01T12:07:09Z**

DONE: Task completed.
