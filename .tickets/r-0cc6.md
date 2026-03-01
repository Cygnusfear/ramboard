---
id: r-0cc6
status: closed
deps: []
links: []
created: 2026-03-01T11:00:00Z
type: task
priority: 1
assignee: oracle
tags: [research, oracle, architecture]
---

# Architecture Review: Context Menu Callback Threading Anti-Pattern

> Commissioned by: r-35bf  
> Focus files: ticket-context-menu.tsx, list-view.tsx, ticket-detail.tsx, ticket-store.ts  
> Playbook applied: 40.01–40.05, 30.01, 30.02  

---

## TL;DR

The context menu system has a **callback-threading anti-pattern**: `MenuContent` reads Zustand directly for tag data but routes all mutations through callback props injected by the caller. This forces every consumer to build the same bridge (store method → ref chain → handler → prop → MenuContent), duplicating ~50 lines across `list-view.tsx` and `ticket-detail.tsx`. The pattern also creates an 11-hop chain from store method to actual store call in the list-view case.

The ref chain in `list-view.tsx` is a *legitimate* performance optimization for virtual list memoization — but it is only necessary because of the callback-threading design. If `MenuContent` (and `DotMenu`) owned their own store connections for mutations, the ref chain disappears entirely.

---

## Phase 1: Architectural Principles Applied

### 40.01 — State Ownership
**Rule:** Every mutable field has exactly ONE writer. Others read.

The store owns ticket mutations — that is correct. But the *bridge* to the store (the handler logic "for each id, call update(pid, id, value)") is duplicated across two consumers:
- `list-view.tsx`: `handleSetStatus`, `handleSetPriority`, etc.
- `ticket-detail.tsx`: `handleCtxSetStatus`, `handleCtxSetPriority`, etc.

Both do the same thing. There is no single owner for "the action of applying a menu selection to the store." **Violation: the bridge is duplicated, not owned once.**

### 40.02 — Module Boundaries
**Rule:** Extract when things have independent reasons to change.

`MenuActions` interface is defined in `ticket-context-menu.tsx` (exported) but **re-declared as an inline type** on `ListRow`'s `menuActions` prop (list-view.tsx, lines 85–92). These two declarations will silently drift.

Also: `MenuContent` mixes two concerns:
1. Rendering menu UI (reason to change: visual design changes)
2. Resolving tag state from the store (reason to change: store shape changes)
3. Deciding which store method to call (indirectly, via callbacks)

**Violation: `MenuActions` type has two sources. `ListRow` uses its own inline version instead of importing.**

### 40.03 — Dependency Direction
**Rule:** Presentation → Domain actions → Shared state. Never circular.

Current dependency for menu mutations:
```
ListView (presentation)
  → creates handlers that call store
  → passes handlers to TicketContextMenu (presentation)
    → passes to MenuContent (presentation)
      → calls handlers (which call store)
```

This is a **presentation-to-presentation callback threading** pattern: a higher-level component (`ListView`) bridges to the store and passes those bridges DOWN through the component tree to a lower-level component (`MenuContent`). The store should be called from presentation directly; there's no domain logic in the middle.

Meanwhile, `MenuContent` already imports directly from the store for reads. The asymmetry is not architecturally justified — it's historical accident.

**Violation: Store reads and store writes have asymmetric call paths, both valid to go direct, but only reads are direct.**

### 40.04 — Domain Logic Separation
**Rule:** Business logic in pure modules. Callbacks are thin glue.

The tag-toggle handler contains business logic:
```typescript
// list-view.tsx handleToggleTag (lines 358–375)
const allHaveTag = ticketIds.every(id => {
  const t = ticketsRef.current.find(t => t.id === id);
  return t?.tags?.includes(tag) ?? false;
});
for (const id of ticketIds) {
  const ticket = ticketsRef.current.find(t => t.id === id);
  const next = allHaveTag
    ? current.filter(t => t !== tag)
    : current.includes(tag) ? current : [...current, tag];
  updateTagsRef.current(pid, id, next);
}
```

This rule ("if all have tag → remove; otherwise add to those missing") is a business rule, not glue. It's buried in a callback function inside a component. It should be a pure function.

The ticket-detail version of the same logic is slightly different (simpler, single-ticket):
```typescript
// ticket-detail.tsx handleCtxToggleTag (lines 73–80)
const current = activeTicket.tags ?? []
const next = current.includes(tag)
  ? current.filter(t => t !== tag)
  : [...current, tag]
```

These are the same concept, slightly different implementations. **30.02 convergence failure.**

**Violation: Tag-toggle logic is a business rule living in a React callback, duplicated with variation across two files.**

### 40.05 — Singleton Patterns
Not a primary violation here. The Zustand store is already a module-level singleton, used correctly.

---

## Phase 2: Full Control/Data Flow Map

### "Set Priority" in ListView — 11 hops

```
STORE DEFINITION
  useTicketStore.updateTicketPriority (ticket-store.ts)
  
  ↓ hop 1: destructured in ListView component
  const { updateTicketPriority } = useTicketStore()   // list-view.tsx:169

  ↓ hop 2: ref created for stability
  const updatePriorityRef = useRef(updateTicketPriority)  // L180

  ↓ hop 3: ref synced each render
  updatePriorityRef.current = updateTicketPriority  // L181

  ↓ hop 4: handler function reads from ref
  function handleSetPriority(ticketIds, priority) {   // L347
    for (const id of ticketIds)
      updatePriorityRef.current(pid, id, priority)
  }

  ↓ hop 5: stored in menuActionsRef object (first write)
  const menuActionsRef = useRef({ onSetPriority: handleSetPriority })  // L388-397

  ↓ hop 6: menuActionsRef re-synced each render (second write)
  menuActionsRef.current = { onSetPriority: handleSetPriority }  // L398-406

  ↓ hop 7: stable wrapper created (runs once via useState)
  const [menuActions] = useState(() => ({
    onSetPriority: (ids, p) => menuActionsRef.current.onSetPriority(ids, p)  // L408
  }))

  ↓ hop 8: passed as prop to ListRow
  <ListRow menuActions={menuActions} />  // L485

  ↓ hop 9: ListRow spreads to DotMenu
  <DotMenu ticket={ticket} {...menuActions} />  // L103

  ↓ hop 10: DotMenu passes to MenuContent as actions prop
  <MenuContent tickets={[ticket]} actions={actions} />  // (ticket-context-menu.tsx:250)

  ↓ hop 11: MenuContent onClick
  onClick={() => actions.onSetPriority(ids, opt.value)}  // (ticket-context-menu.tsx:97)

  ↓ FINAL: store.updateTicketPriority(projectId, id, priority)
```

**Total: 11 hops. A UI click requires crossing 11 boundaries before the store receives it.**

The same action in TicketContextMenu (context menu on the list) uses hops 4, 8, 10, 11 — still 8 hops (handleSetPriority is reused here too).

For comparison, `BulkActionBar` calls the store in 2 hops: destructure → call. That is the correct pattern.

---

## Phase 3: Root Cause Analysis

### Primary cause: MenuContent is asymmetrically coupled

`MenuContent` calls `useTicketStore` directly for reads (tag list):
```typescript
const allTickets = useTicketStore(s => s.tickets)  // direct ✓
```

But receives all mutations as callback props:
```typescript
onClick={() => actions.onSetStatus(ids, opt.value)  // via prop ✗
```

There is no architectural reason for this asymmetry. Both are store operations. The likely cause: the menu was designed to be "pure/dumb UI" that can be used anywhere. But it already broke that contract by importing the store directly.

Once you accept that MenuContent can know about the store (which it does), the callback props are unnecessary complexity.

### Secondary cause: Memoization requirement in virtual list

`ListRow` is `memo()`-wrapped because the virtual list renders hundreds of rows. If `menuActions` isn't a stable reference, every row re-renders on each parent update. This is why the ref chain + stable wrapper exists.

This is a **legitimate performance requirement** — but it wouldn't be needed if `DotMenu` subscribed to the store directly (no menuActions prop → no memoization concern for that prop).

### Tertiary cause: Missing type reuse

`ListRow` defines its own inline type for `menuActions` instead of importing the exported `MenuActions` type from `ticket-context-menu.tsx`. This is simply an oversight — the type exists and is exported.

---

## Phase 4: Principle Violations Summary

| Violation | Principle | Severity | Location |
|-----------|-----------|----------|----------|
| MenuActions type duplicated (inline on ListRow) | 40.02 Module Boundaries | Low — no behavior change | list-view.tsx:85–92 |
| Tag-toggle business rule in component callback | 40.04 Domain Logic Separation | Medium — duplicated with variation | list-view.tsx:358–375, ticket-detail.tsx:73–80 |
| Callback threading: store mutations routed through props | 40.03 Dependency Direction | High — structural issue, adds 9 extra hops | list-view.tsx, ticket-detail.tsx |
| Handler logic duplicated across two consumers | 40.01 State Ownership / 30.02 Convergence | High — semantic duplication | list-view.tsx:341–384, ticket-detail.tsx:65–90 |

---

## Phase 5: Pattern Spread Assessment

The callback-threading pattern is **confined to the menu system** and does not spread elsewhere.

- `BulkActionBar`: calls `useTicketStore` directly. No callback threading. ✓
- `BoardView`: no context menus, no callback threading. ✓  
- `HeaderBar`, `CommandPalette`: direct store access. ✓
- `TicketDetail` inline actions (InlineSelect, TagEditor): call store directly via closure in JSX. ✓

The anti-pattern is isolated to: (1) the context menu system itself, and (2) the consumers that must bridge to it.

This is good news — the refactoring scope is small.

---

## Phase 6: Concrete Refactoring Recommendation

### Option A: Minimal (Low risk, ~20 minutes)
Fix only the type duplication. No behavior change.

```typescript
// list-view.tsx — replace inline type with import
import type { MenuActions } from './ticket-context-menu'  // ADD

// Change ListRow props from inline type to:
menuActions: MenuActions  // REPLACE the 7-line inline type block
```

**Eliminates:** MenuActions duplication  
**Leaves intact:** The ref chain, the callback threading, the handler duplication

---

### Option B: Recommended (Medium risk, ~2 hours)
Move mutation responsibility into `MenuContent` and `DotMenu`. They already know about the store — give them write access too. Keep only `onOpen` as an external callback (it's context-specific: list navigates, detail is a no-op).

**Step 1: Create `useMenuActions` hook in ticket-context-menu.tsx**
```typescript
// Replaces MenuActions interface + all caller bridge code
function useMenuActions(tickets: TicketSummary[]) {
  const { activeProjectId } = useProjectStore()
  const { 
    updateTicketStatus, updateTicketPriority, 
    updateTicketType, updateTicketTags,
    tickets: allTickets,
  } = useTicketStore()

  return {
    onSetStatus: useCallback((ids: string[], status: string) => {
      if (!activeProjectId) return
      for (const id of ids) updateTicketStatus(activeProjectId, id, status)
    }, [activeProjectId, updateTicketStatus]),

    onSetPriority: useCallback((ids: string[], priority: number) => {
      if (!activeProjectId) return
      for (const id of ids) updateTicketPriority(activeProjectId, id, priority)
    }, [activeProjectId, updateTicketPriority]),

    onSetType: useCallback((ids: string[], type: string) => {
      if (!activeProjectId) return
      for (const id of ids) updateTicketType(activeProjectId, id, type)
    }, [activeProjectId, updateTicketType]),

    onToggleTag: useCallback((ids: string[], tag: string) => {
      if (!activeProjectId) return
      const allHaveTag = ids.every(id => 
        (allTickets.find(t => t.id === id)?.tags ?? []).includes(tag)
      )
      for (const id of ids) {
        const ticket = allTickets.find(t => t.id === id)
        if (!ticket) continue
        const current = ticket.tags ?? []
        const next = allHaveTag 
          ? current.filter(t => t !== tag)
          : current.includes(tag) ? current : [...current, tag]
        updateTicketTags(activeProjectId, id, next)
      }
    }, [activeProjectId, allTickets, updateTicketStatus, updateTicketTags]),
  }
}
```

**Step 2: Refactor MenuContent to use the hook**
```typescript
// BEFORE
function MenuContent({ tickets, actions, NS, hideOpen }) {
  const allTickets = useTicketStore(s => s.tickets)
  // ... actions.onSetStatus(ids, opt.value) on click

// AFTER  
function MenuContent({ tickets, NS, hideOpen, onOpen }: {
  tickets: TicketSummary[]
  NS: typeof ContextMenu | typeof Menu
  hideOpen?: boolean
  onOpen?: (ticketId: string) => void  // ONLY context-specific callback
}) {
  const actions = useMenuActions(tickets)
  const allTickets = useTicketStore(s => s.tickets)
  // ... actions.onSetStatus(ids, opt.value) unchanged
```

**Step 3: Remove the MenuActions interface and callback props from TicketContextMenu/DotMenu**
```typescript
// BEFORE
export interface MenuActions { ... }  // DELETE

// TicketContextMenu spread: {...actions}
// DotMenu spread: {...actions}

// AFTER: only onOpen remains as optional prop
interface TicketContextMenuProps {
  children: React.ReactNode
  targetTickets: TicketSummary[]
  triggerClassName?: string
  hideOpen?: boolean
  onOpen?: (ticketId: string) => void  // only unique-per-context behavior
}
```

**Step 4: Gut list-view.tsx**
```typescript
// DELETE:
// - updateStatusRef, updatePriorityRef, updateTypeRef, updateTagsRef (all 4 store refs)
// - handleSetStatus, handleSetPriority, handleSetType, handleToggleTag, handleCopyId, handleOpenTicket
// - menuActionsRef and its double-write
// - [menuActions] stable wrapper
// - MenuActions prop on ListRow (and its 7-line inline type)

// KEEP:
// - navigateRef, activeProjectRef, ticketsRef (still needed by engine)
// - onOpen handler (context-specific: navigate to ticket)

// TicketContextMenu usage:
<TicketContextMenu
  targetTickets={viewState.contextTargets}
  onOpen={handleOpenTicket}  // only this
>

// ListRow no longer needs menuActions prop:
<ListRow ticket={ticket} index={...} isHighlighted={...} isSelected={...} />
// DotMenu inside ListRow no longer needs action props:
<DotMenu ticket={ticket} onOpen={handleOpenTicket} />
```

**Step 5: Gut ticket-detail.tsx**
```typescript
// DELETE:
// - handleCtxSetStatus, handleCtxSetPriority, handleCtxSetType  
// - handleCtxToggleTag, handleCtxCopyId, handleCtxOpen (6 useCallbacks)

// TicketContextMenu:
<TicketContextMenu
  targetTickets={[activeTicket]}
  hideOpen  // onOpen is a no-op here anyway
  // all the onSetX props removed
>
```

**Result:**
- `list-view.tsx`: ~60 lines removed
- `ticket-detail.tsx`: ~25 lines removed  
- `ticket-context-menu.tsx`: ~30 lines added (hook)
- Net: ~55 lines deleted
- Adding a new action (e.g., `onSetAssignee`): touch 1 file (ticket-context-menu.tsx) instead of 3

---

### Option C: Extract tag-toggle as pure function (Add-on to B)
The tag-toggle logic in `useMenuActions` is a business rule. Extract it:

```typescript
// src/lib/ticket-mutations.ts  (new file)
export function computeTagToggle(
  currentTags: string[],
  tag: string,
  add: boolean,
): string[] {
  if (add) return currentTags.includes(tag) ? currentTags : [...currentTags, tag]
  return currentTags.filter(t => t !== tag)
}

export function resolveTagToggleIntent(
  tickets: Pick<TicketSummary, 'id' | 'tags'>[],
  ids: string[],
  tag: string,
): Map<string, string[]> {
  const allHave = ids.every(id =>
    (tickets.find(t => t.id === id)?.tags ?? []).includes(tag)
  )
  const result = new Map<string, string[]>()
  for (const id of ids) {
    const ticket = tickets.find(t => t.id === id)
    if (!ticket) continue
    result.set(id, computeTagToggle(ticket.tags ?? [], tag, !allHave))
  }
  return result
}
```

This makes the business rule testable, visible, and single-sourced.

---

## Risk Assessment

| Option | Risk | Effort | Value |
|--------|------|--------|-------|
| A: Fix type import | **None** — pure type change | 5 min | Low — stops drift |
| B: Move mutations to MenuContent | **Low-Medium** | 2 hrs | High — removes ~55 lines, eliminates 11-hop chain |
| C: Extract tag logic | **Low** | 30 min | Medium — testable business rule |

**B is the right call.** The main risk is: DotMenu now subscribes to `useProjectStore` and `useTicketStore` directly. In a virtual list with 500 visible rows, that means 500 Zustand subscriptions. However:
- These subscriptions select only `activeProjectId` (a scalar) and the mutation methods (which are stable references in Zustand — they don't change)
- Zustand subscriptions are lightweight and selector-based
- The ticket data (`allTickets` for tag resolution) only needs to be read at click time, not subscribed reactively — this can be done via `useTicketStore.getState()` to avoid a subscription

**Zustand optimization for DotMenu:**
```typescript
// Read allTickets at action time, not as reactive subscription
const onToggleTag = useCallback((ids: string[], tag: string) => {
  const allTickets = useTicketStore.getState().tickets  // snapshot, no subscription
  // ...
}, [activeProjectId, updateTicketTags])
```

This eliminates the per-row subscription concern entirely.

---

## Collateral Damage Assessment

**Immediate impact of Option B:**
- `list-view.tsx` — significant surgery (delete ~60 lines of ref chain)
- `ticket-detail.tsx` — moderate surgery (delete 6 useCallbacks)
- `ticket-context-menu.tsx` — moderate addition (add hook + remove MenuActions interface)

**Consumers of MenuActions interface:** only `list-view.tsx` (import, plus the inline redeclaration). Safe to delete.

**Tests:** No test files found for these components. Manual smoke test needed: right-click menu works, dot menu works, status/priority/type/tag changes save, multi-select bulk changes work.

---

## Conclusion

The callback-threading pattern in the context menu system is **architecturally wrong** by principles 40.03 (dependency direction) and 40.04 (domain logic separation), and creates **30.02 convergence duplication** of the same handler logic across two files. The ref chain in `list-view.tsx` is a legitimate optimization, but it's necessitated by the wrong design choice in `MenuContent`.

The correct architecture: `MenuContent` and `DotMenu` own their store connections (reads AND writes). Only context-specific behavior (`onOpen`) remains as an external callback. This is consistent with what `BulkActionBar` already does correctly.

Option B is the recommended path. The risk is low (mostly additive in the menu component, deletive in the consumers), and the result is a codebase where adding a new menu action requires touching exactly 1 file.

---

## Goal
Perform an architectural code review of the ticket context menu system.

## Acceptance Criteria
- [x] Each violated architectural principle identified with specific line references
- [x] Full control/data flow traced end-to-end with hop count (11 hops)
- [x] Root cause identified (MenuContent asymmetric coupling: reads store direct, writes via props)
- [x] Concrete before/after refactoring proposal (Options A, B, C)
- [x] Pattern spread assessed (isolated to menu system, not systemic)
- [x] Risk level assessed for each option

## Verification
- Review ticket r-0cc6 contains complete architectural findings
- All 4 architectural violations cited with file+line
- Refactoring recommendation is actionable (step-by-step with code)
