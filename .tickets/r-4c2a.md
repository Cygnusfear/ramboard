---
id: r-4c2a
status: closed
deps: []
links: []
created: 2026-03-01T12:13:15Z
type: task
priority: 2
assignee: t3-selection
tags: [team]
---
# Working directory: /Users/alexander/Projects/ramboard/.worktrees/t3-selection

Read AGENTS.md first. Then read ALL of these files completely before making any changes:
- `src/lib/list-interaction.ts`
- `src/components/list-view.tsx`
- `src/stores/ui-store.ts`
- `src/hooks/use-keyboard.ts`
- `src/components/bulk-action-bar.tsx`

## T3-01: Fix selection state split ownership

### The Problem
Selection state has TWO sources of truth:
1. `list-interaction.ts` engine owns `selection: Set<string>` internally
2. `useUIStore.selectedIds` is the store read by `BulkActionBar` and `use-keyboard.ts`

The sync is ONE-WAY: engine → useEffect → UIStore. But keyboard mutations (`x` toggle, `X` range-select via `ui.toggleSelection()`/`ui.rangeSelect()`) write directly to UIStore, BYPASSING the engine. After pressing `x`, the engine's internal selection is stale — shift-clicking won't work correctly because the engine doesn't know what's selected.

### The Fix: Make UIStore canonical, engine uses callbacks

Instead of the engine owning selection internally, it reads/writes through callbacks. UIStore becomes the single source of truth.

1. **In `src/lib/list-interaction.ts`**:
   - Add to the callbacks interface: `getSelection: () => Set<string>`, `setSelection: (sel: Set<string>) => void`, `getSelectionAnchor: () => string | null`, `setSelectionAnchor: (id: string | null) => void`
   - Remove `selection` from `ListViewState` — the engine no longer owns it. `ListViewState` only needs `contextTargets`.
   - Every place the engine reads `state.selection` → call `callbacks.getSelection()`
   - Every place the engine writes selection → call `callbacks.setSelection(newSet)` (and optionally `callbacks.setSelectionAnchor(id)`)
   - The `onChange` callback still fires for `contextTargets` changes
   - The engine stays pure TypeScript — no UIStore import

2. **In `src/components/list-view.tsx`**:
   - Wire the new callbacks to UIStore:
     ```typescript
     getSelection: () => useUIStore.getState().selectedIds,
     setSelection: (sel) => useUIStore.setState({ selectedIds: sel }),
     getSelectionAnchor: () => useUIStore.getState().selectionAnchor,
     setSelectionAnchor: (id) => useUIStore.setState({ selectionAnchor: id }),
     ```
   - Remove the `useEffect` that syncs `viewState.selection` → UIStore (it's no longer needed)
   - The `viewState` local state now only holds `contextTargets`
   - For rendering `isSelected` in ListRow: read from UIStore instead of local viewState. Use `useUIStore(s => s.selectedIds)` as a stable reference.

3. **In `src/hooks/use-keyboard.ts`**:
   - The `x` and `X` keybindings already write to UIStore directly via `ui.toggleSelection()` and `ui.rangeSelect()` — this is now correct since UIStore is canonical. No changes needed here.

4. **In `src/stores/ui-store.ts`**:
   - No structural changes needed. It already has `selectedIds`, `selectionAnchor`, `toggleSelection`, `rangeSelect`, `selectAll`, `clearSelection`.

### Key Concern: Render Performance
ListView is virtualized. The `selection` Set from UIStore changes on every selection toggle. You need the `selection` Set in the render to pass `isSelected` to each ListRow. Use a single `useUIStore(s => s.selectedIds)` call at the ListView level and pass the set down — do NOT subscribe per-row.

After:
1. Verify: `npx tsc --noEmit 2>&1 | grep -v server/`
2. Test mentally: click select, shift-click, ctrl-click, keyboard x, keyboard X, escape, Cmd+A — all should work through single UIStore source
3. Commit: `git add -A && git commit -m 'refactor: unify selection ownership — UIStore is canonical, engine uses callbacks'`

Working directory: /Users/alexander/Projects/ramboard/.worktrees/t3-selection

Read AGENTS.md first. Then read ALL of these files completely before making any changes:
- `src/lib/list-interaction.ts`
- `src/components/list-view.tsx`
- `src/stores/ui-store.ts`
- `src/hooks/use-keyboard.ts`
- `src/components/bulk-action-bar.tsx`

## T3-01: Fix selection state split ownership

### The Problem
Selection state has TWO sources of truth:
1. `list-interaction.ts` engine owns `selection: Set<string>` internally
2. `useUIStore.selectedIds` is the store read by `BulkActionBar` and `use-keyboard.ts`

The sync is ONE-WAY: engine → useEffect → UIStore. But keyboard mutations (`x` toggle, `X` range-select via `ui.toggleSelection()`/`ui.rangeSelect()`) write directly to UIStore, BYPASSING the engine. After pressing `x`, the engine's internal selection is stale — shift-clicking won't work correctly because the engine doesn't know what's selected.

### The Fix: Make UIStore canonical, engine uses callbacks

Instead of the engine owning selection internally, it reads/writes through callbacks. UIStore becomes the single source of truth.

1. **In `src/lib/list-interaction.ts`**:
   - Add to the callbacks interface: `getSelection: () => Set<string>`, `setSelection: (sel: Set<string>) => void`, `getSelectionAnchor: () => string | null`, `setSelectionAnchor: (id: string | null) => void`
   - Remove `selection` from `ListViewState` — the engine no longer owns it. `ListViewState` only needs `contextTargets`.
   - Every place the engine reads `state.selection` → call `callbacks.getSelection()`
   - Every place the engine writes selection → call `callbacks.setSelection(newSet)` (and optionally `callbacks.setSelectionAnchor(id)`)
   - The `onChange` callback still fires for `contextTargets` changes
   - The engine stays pure TypeScript — no UIStore import

2. **In `src/components/list-view.tsx`**:
   - Wire the new callbacks to UIStore:
     ```typescript
     getSelection: () => useUIStore.getState().selectedIds,
     setSelection: (sel) => useUIStore.setState({ selectedIds: sel }),
     getSelectionAnchor: () => useUIStore.getState().selectionAnchor,
     setSelectionAnchor: (id) => useUIStore.setState({ selectionAnchor: id }),
     ```
   - Remove the `useEffect` that syncs `viewState.selection` → UIStore (it's no longer needed)
   - The `viewState` local state now only holds `contextTargets`
   - For rendering `isSelected` in ListRow: read from UIStore instead of local viewState. Use `useUIStore(s => s.selectedIds)` as a stable reference.

3. **In `src/hooks/use-keyboard.ts`**:
   - The `x` and `X` keybindings already write to UIStore directly via `ui.toggleSelection()` and `ui.rangeSelect()` — this is now correct since UIStore is canonical. No changes needed here.

4. **In `src/stores/ui-store.ts`**:
   - No structural changes needed. It already has `selectedIds`, `selectionAnchor`, `toggleSelection`, `rangeSelect`, `selectAll`, `clearSelection`.

### Key Concern: Render Performance
ListView is virtualized. The `selection` Set from UIStore changes on every selection toggle. You need the `selection` Set in the render to pass `isSelected` to each ListRow. Use a single `useUIStore(s => s.selectedIds)` call at the ListView level and pass the set down — do NOT subscribe per-row.

After:
1. Verify: `npx tsc --noEmit 2>&1 | grep -v server/`
2. Test mentally: click select, shift-click, ctrl-click, keyboard x, keyboard X, escape, Cmd+A — all should work through single UIStore source
3. Commit: `git add -A && git commit -m 'refactor: unify selection ownership — UIStore is canonical, engine uses callbacks'`


## Notes

**2026-03-01T12:16:46Z**

Starting implementation: read all files. Plan: 
1. Update list-interaction.ts — add selection callbacks to deps, remove selection from ListViewState, wire all reads/writes through callbacks
2. Update list-view.tsx — wire callbacks, drop sync useEffect, subscribe to UIStore.selectedIds for rendering
3. No changes needed to ui-store.ts or use-keyboard.ts

**2026-03-01T12:18:51Z**

DONE: Refactored selection state to have a single source of truth.

Changes:
- `list-interaction.ts`: Added 4 callbacks to deps (`getSelection`, `setSelection`, `getSelectionAnchor`, `setSelectionAnchor`). Removed `selection` from `ListViewState` — engine no longer owns it. All internal reads/writes go through the callbacks. `contextTargets` is the only thing left in engine state.
- `list-view.tsx`: Wired the new callbacks to UIStore.getState()/setState(). Removed the `useEffect` that synced viewState.selection → UIStore. Added `useUIStore(s => s.selectedIds)` subscription at ListView level for rendering. Updated info bar and ListRow `isSelected` to use `selectedIds` from UIStore.
- No changes to `ui-store.ts` or `use-keyboard.ts` — already correct.

TypeScript: clean (no errors). Committed as 528dc88.

**2026-03-01T12:19:03Z**

DONE: Task completed.
