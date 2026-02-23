/**
 * List interaction state machine — handles selection, drag-select,
 * click navigation, context menu, and keyboard for the ticket list.
 *
 * Pure TypeScript. No React. No hooks. No DOM queries.
 * Holds all mutable state internally. Calls onChange() when the
 * view needs to re-render.
 *
 * The React component creates one instance via useRef, wires up
 * event handlers that call machine methods, and subscribes to
 * onChange for re-renders. That's it.
 */

import type { TicketSummary } from './types'

// ── Public state (what React reads) ───────────────────────────

export interface ListViewState {
  /** Selected ticket IDs — stable across filter/sort */
  selection: Set<string>
  /** Tickets targeted by the context menu */
  contextTargets: TicketSummary[]
}

// ── Status cycle ──────────────────────────────────────────────

const STATUS_CYCLE: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'closed',
  closed: 'open',
  cancelled: 'open',
}

// ── Factory ───────────────────────────────────────────────────

export interface ListInteractionDeps {
  /** Return the current visible (filtered+sorted) ticket array */
  getTickets: () => TicketSummary[]
  /** Navigate to a ticket's detail page */
  navigate: (ticketId: string) => void
  /** Update a ticket's status */
  cycleStatus: (ticketId: string, newStatus: string) => void
  /** Called whenever viewable state changes — React calls setState here */
  onChange: (state: ListViewState) => void
}

const DRAG_THRESHOLD = 4

export function createListInteraction(deps: ListInteractionDeps) {
  // ── Internal mutable state ────────────────────────────────

  let selection = new Set<string>()
  let contextTargets: TicketSummary[] = []

  // Drag engine (index-based for range math, converted to IDs on commit)
  let dragging = false
  let anchorIndex = -1
  let currentIndex = -1
  let baseSelection = new Set<string>()

  // Pending drag (deferred until mouse moves past threshold)
  let pendingDrag: { index: number; x: number; y: number } | null = null

  // ── Helpers ───────────────────────────────────────────────

  function snapshot(): ListViewState {
    return { selection, contextTargets }
  }

  function notify() {
    deps.onChange(snapshot())
  }

  function ticketAt(idx: number): TicketSummary | undefined {
    return deps.getTickets()[idx]
  }

  /** Build a Set<string> of ticket IDs for index range [a..b] */
  function idsInRange(a: number, b: number): Set<string> {
    const tickets = deps.getTickets()
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    const ids = new Set<string>()
    for (let i = lo; i <= hi; i++) {
      if (tickets[i]) ids.add(tickets[i].id)
    }
    return ids
  }

  function commitDragRange() {
    const range = idsInRange(anchorIndex, currentIndex)
    for (const id of baseSelection) range.add(id)
    selection = range
  }

  // ── Public methods ────────────────────────────────────────

  /** Call from container onMouseDown */
  function mousedown(
    index: number,
    clientX: number,
    clientY: number,
    mods: { shift: boolean; meta: boolean },
    action: string | null,
  ): 'stop' | 'prevent' | void {
    const ticket = ticketAt(index)
    if (!ticket) return

    // Checkbox — toggle single item
    if (action === 'checkbox') {
      const next = new Set(selection)
      if (next.has(ticket.id)) next.delete(ticket.id)
      else next.add(ticket.id)
      anchorIndex = index
      baseSelection = next
      selection = next
      notify()
      return 'stop'
    }

    // Status dot — let click handle it
    if (action === 'status') return

    // Cmd/Ctrl+click — toggle
    if (mods.meta) {
      const next = new Set(selection)
      if (next.has(ticket.id)) next.delete(ticket.id)
      else next.add(ticket.id)
      anchorIndex = index
      baseSelection = next
      selection = next
      notify()
      return 'prevent'
    }

    // Shift+click — range extend
    if (mods.shift && anchorIndex >= 0) {
      currentIndex = index
      commitDragRange()
      notify()
      return 'prevent'
    }

    // Plain click — defer drag until mouse moves past threshold
    pendingDrag = { index, x: clientX, y: clientY }
    return 'prevent'
  }

  /** Call from container onClick */
  function click(
    index: number,
    mods: { shift: boolean; meta: boolean },
    action: string | null,
  ): 'stop' | void {
    const ticket = ticketAt(index)
    if (!ticket) return

    // Status dot — cycle
    if (action === 'status') {
      deps.cycleStatus(ticket.id, STATUS_CYCLE[ticket.status] ?? 'open')
      return 'stop'
    }

    // Checkbox — already handled in mousedown
    if (action === 'checkbox') return

    // Modifier clicks — already handled in mousedown
    if (mods.shift || mods.meta) return

    // Plain click with no selection → navigate
    if (!dragging && selection.size === 0) {
      pendingDrag = null
      deps.navigate(ticket.id)
      return
    }

    // Plain click with active selection → clear
    if (selection.size > 0 && !dragging) {
      clear()
    }
  }

  /** Is the mouse free to update highlight? (not during drag or pending drag) */
  function canHighlight(): boolean {
    return !dragging && !pendingDrag
  }

  /** Call from window mousemove listener */
  function globalMousemove(
    clientX: number,
    clientY: number,
    indexAtPoint: number | null,
  ): boolean {
    // Check pending drag threshold
    if (pendingDrag && !dragging) {
      const dx = Math.abs(clientX - pendingDrag.x)
      const dy = Math.abs(clientY - pendingDrag.y)
      if (dx + dy >= DRAG_THRESHOLD) {
        // Activate drag
        dragging = true
        anchorIndex = pendingDrag.index
        currentIndex = pendingDrag.index
        const ticket = ticketAt(pendingDrag.index)
        baseSelection = new Set()
        selection = ticket ? new Set([ticket.id]) : new Set()
        pendingDrag = null
        notify()
      }
      return dragging
    }

    if (!dragging || indexAtPoint === null) return dragging
    if (indexAtPoint === currentIndex) return true

    currentIndex = indexAtPoint
    commitDragRange()
    notify()
    return true
  }

  /** Call from window mouseup listener */
  function globalMouseup() {
    pendingDrag = null
    if (dragging) {
      dragging = false
      baseSelection = new Set(selection)
      notify()
    }
  }

  /** Call from container onContextMenu */
  function contextmenu(index: number) {
    const ticket = ticketAt(index)
    if (!ticket) return

    if (selection.has(ticket.id)) {
      // Right-clicked a selected row → menu applies to all selected
      contextTargets = deps.getTickets().filter(t => selection.has(t.id))
    } else {
      // Right-clicked a non-selected row → select just this one
      anchorIndex = index
      baseSelection = new Set([ticket.id])
      selection = new Set([ticket.id])
      contextTargets = [ticket]
    }
    notify()
  }

  /** Escape key — clear selection */
  function escape() {
    if (selection.size > 0) clear()
  }

  /** Cmd+A — select all visible tickets */
  function selectAll() {
    const tickets = deps.getTickets()
    selection = new Set(tickets.map(t => t.id))
    notify()
  }

  /** Clear all selection and drag state */
  function clear() {
    dragging = false
    anchorIndex = -1
    currentIndex = -1
    baseSelection = new Set()
    selection = new Set()
    contextTargets = []
    notify()
  }

  /** Read current state without triggering onChange */
  function getState(): ListViewState {
    return snapshot()
  }

  function isDragging() {
    return dragging
  }

  return {
    mousedown,
    click,
    canHighlight,
    globalMousemove,
    globalMouseup,
    contextmenu,
    escape,
    selectAll,
    clear,
    getState,
    isDragging,
  }
}

export type ListInteraction = ReturnType<typeof createListInteraction>
