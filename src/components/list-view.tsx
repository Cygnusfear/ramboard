import { useRef, useCallback, useEffect, useState, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { useTicketStore } from '@/stores/ticket-store'
import { useFilterStore } from '@/stores/filter-store'
import { useFilteredTickets } from '@/hooks/use-filtered-tickets'
import { useLocation } from 'wouter'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'
import { TagList } from './tag-pill'
import { CaretUp, CaretDown, Check } from '@phosphor-icons/react'
import {
  type DragSelectState,
  createDragSelectState,
  dragStart,
  dragMove,
  dragEnd,
  dragClear,
} from '@/lib/drag-select'
import { TicketContextMenu } from './ticket-context-menu'
import type { SortField, TicketSummary } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────

/** Fixed row height enforced by CSS — no dynamic measurement needed */
const ROW_HEIGHT = 36

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const days = Math.floor((now - then) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const STATUS_CYCLE: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'closed',
  closed: 'open',
  cancelled: 'open',
}

// ── Sort header ───────────────────────────────────────────────

function SortHeader({ field, label, className }: { field: SortField; label: string; className?: string }) {
  const { sortField, sortDir, setSort } = useFilterStore()
  const active = sortField === field

  return (
    <button
      onClick={() => setSort(field)}
      className={`flex items-center gap-0.5 text-[11px] uppercase tracking-wider select-none ${
        active ? 'text-zinc-300' : 'text-zinc-600 hover:text-zinc-400'
      } ${className ?? ''}`}
    >
      {label}
      {active && (sortDir === 'asc' ? <CaretUp size={10} weight="bold" /> : <CaretDown size={10} weight="bold" />)}
    </button>
  )
}

// ── Single row — memoized, no transitions during scroll ───────

const ListRow = memo(function ListRow({
  ticket,
  index,
  isHighlighted,
  isSelected,
}: {
  ticket: TicketSummary
  index: number
  isHighlighted: boolean
  isSelected: boolean
}) {
  return (
    <div
      data-index={index}
      className={`list-row group/row grid h-9 w-full cursor-default grid-cols-[28px_1fr_72px_96px_64px] items-center gap-0 border-b border-zinc-800/40 px-3 ${
        isSelected
          ? 'bg-blue-500/[0.07]'
          : isHighlighted
            ? 'bg-zinc-800/40'
            : ''
      }`}
    >
      {/* Checkbox */}
      <div
        data-action="checkbox"
        className={`flex items-center justify-center ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
        }`}
      >
        <div
          className={`flex size-4 items-center justify-center rounded border ${
            isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-zinc-600 hover:border-zinc-400'
          }`}
        >
          {isSelected && <Check size={10} weight="bold" className="text-white" />}
        </div>
      </div>

      {/* Title + ID + Tags */}
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <span className="shrink-0 font-mono text-[11px] text-zinc-600">{ticket.id}</span>
        <span className="truncate text-[13px] leading-tight text-zinc-200">{ticket.title}</span>
        {ticket.tags.length > 0 && (
          <span className="ml-1 shrink-0">
            <TagList tags={ticket.tags} max={2} />
          </span>
        )}
      </div>

      {/* Priority */}
      <div className="flex justify-center">
        <PriorityIcon priority={ticket.priority} />
      </div>

      {/* Status — clickable to cycle */}
      <div data-action="status" className="flex cursor-pointer justify-center">
        <StatusDot status={ticket.status} showLabel />
      </div>

      {/* Created */}
      <span className="text-right text-[11px] text-zinc-600">{timeAgo(ticket.created)}</span>
    </div>
  )
})

// ── Main list view ────────────────────────────────────────────

export function ListView() {
  const tickets = useFilteredTickets()
  const highlightIndex = useUIStore(s => s.highlightIndex)
  const setHighlightIndex = useUIStore(s => s.setHighlightIndex)
  const { activeProjectId } = useProjectStore()
  const { updateTicketStatus } = useTicketStore()
  const [, navigate] = useLocation()

  // Drag-select engine works with indices (for range math).
  // Committed selection is ticket IDs — stable across re-sorts/re-filters.
  const dsRef = useRef<DragSelectState>(createDragSelectState())
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track scrolling to suppress mouseEnter highlights
  const isScrolling = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Drag threshold — defer selection until mouse moves 4+ px from mousedown origin
  const DRAG_THRESHOLD = 4
  const pendingDrag = useRef<{
    index: number
    x: number
    y: number
    shift: boolean
    meta: boolean
  } | null>(null)

  /** Commit drag-select engine state → convert indices to ticket IDs */
  const commitSelection = useCallback((state: DragSelectState) => {
    dsRef.current = state
    const ids = new Set<string>()
    for (const idx of state.selection) {
      const t = tickets[idx]
      if (t) ids.add(t.id)
    }
    setSelection(ids)
  }, [tickets])

  // Context menu — track which tickets the right-click applies to
  const [contextTargets, setContextTargets] = useState<TicketSummary[]>([])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const row = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null
    if (!row) return
    const idx = parseInt(row.dataset.index!, 10)
    const ticket = tickets[idx]
    if (!ticket) return

    // If right-clicked row is already selected, menu applies to all selected
    if (selection.has(ticket.id)) {
      setContextTargets(tickets.filter(t => selection.has(t.id)))
    } else {
      // Select just this row, menu applies to it alone
      commitSelection(dragStart(createDragSelectState(), idx, {}))
      setContextTargets([ticket])
    }
  }, [tickets, selection, commitSelection])

  const handleSetStatus = useCallback((ticketIds: string[], status: string) => {
    if (!activeProjectId) return
    for (const id of ticketIds) updateTicketStatus(activeProjectId, id, status)
  }, [activeProjectId, updateTicketStatus])

  const handleSetPriority = useCallback((_ticketIds: string[], _priority: number) => {
    // TODO: implement priority update API
  }, [])

  const handleCopyId = useCallback((ticketIds: string[]) => {
    navigator.clipboard.writeText(ticketIds.join(', '))
  }, [])

  const handleOpenTicket = useCallback((ticketId: string) => {
    if (activeProjectId) navigate(`/${activeProjectId}/ticket/${ticketId}`)
  }, [activeProjectId, navigate])

  // Virtualizer — fixed row height, no measurement, pure math
  const virtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  })

  // Detect scroll to suppress mouseEnter
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      isScrolling.current = true
      clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => { isScrolling.current = false }, 100)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Sync selection (already ticket IDs) to UI store for bulk action bar
  useEffect(() => {
    useUIStore.setState({ selectedIds: selection })
  }, [selection])

  // Single event handler on the container — no per-row handlers
  //
  // Click behavior (like Linear):
  //   Plain click        → navigate to ticket
  //   Cmd/Ctrl+click     → toggle selection (immediate)
  //   Shift+click        → range select (immediate)
  //   Click + drag (4px) → start drag-select
  //   Checkbox click     → toggle selection (immediate)
  //   Status click       → cycle status
  const handleContainerEvent = useCallback((e: React.MouseEvent) => {
    const row = (e.target as HTMLElement).closest('[data-index]') as HTMLElement | null
    if (!row) return
    const idx = parseInt(row.dataset.index!, 10)
    const ticket = tickets[idx]
    if (!ticket) return

    if (e.type === 'mousedown') {
      if (e.button !== 0) return
      const action = (e.target as HTMLElement).closest('[data-action]')
      if (action?.getAttribute('data-action') === 'checkbox') {
        e.stopPropagation()
        commitSelection(dragStart(dsRef.current, idx, { meta: true }))
        return
      }
      if (action?.getAttribute('data-action') === 'status') return

      // Modifier clicks are immediate (no drag threshold)
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        e.preventDefault()
        commitSelection(dragStart(dsRef.current, idx, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey }))
        return
      }

      // Plain click — defer drag until mouse moves past threshold
      e.preventDefault()
      pendingDrag.current = { index: idx, x: e.clientX, y: e.clientY, shift: false, meta: false }
    }

    if (e.type === 'click') {
      const action = (e.target as HTMLElement).closest('[data-action]')
      if (action?.getAttribute('data-action') === 'status') {
        e.stopPropagation()
        if (activeProjectId) {
          updateTicketStatus(activeProjectId, ticket.id, STATUS_CYCLE[ticket.status] ?? 'open')
        }
        return
      }
      if (action?.getAttribute('data-action') === 'checkbox') return

      // Plain click → navigate ONLY if no selection active and no modifiers
      if (!dsRef.current.dragging && activeProjectId && selection.size === 0 && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        pendingDrag.current = null
        navigate(`/${activeProjectId}/ticket/${ticket.id}`)
      }
      // Click with no modifiers while items are selected → clear selection
      if (selection.size > 0 && !e.shiftKey && !e.metaKey && !e.ctrlKey && !dsRef.current.dragging) {
        dsRef.current = createDragSelectState()
        setSelection(new Set())
      }
    }

    if (e.type === 'mousemove') {
      if (!isScrolling.current && !dsRef.current.dragging && !pendingDrag.current) {
        setHighlightIndex(idx)
      }
    }
  }, [tickets, activeProjectId, navigate, updateTicketStatus, commitSelection, setHighlightIndex, selection])

  // Global mousemove/mouseup during drag
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // Check pending drag threshold
      const pending = pendingDrag.current
      if (pending && !dsRef.current.dragging) {
        const dx = e.clientX - pending.x
        const dy = e.clientY - pending.y
        if (Math.abs(dx) + Math.abs(dy) >= DRAG_THRESHOLD) {
          // Threshold exceeded — activate drag-select
          commitSelection(dragStart(dsRef.current, pending.index, { shift: pending.shift, meta: pending.meta }))
          pendingDrag.current = null
        }
        return
      }

      if (!dsRef.current.dragging) return
      const container = scrollRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const edgeZone = 40
        const speed = 8
        if (e.clientY < rect.top + edgeZone) container.scrollTop -= speed
        else if (e.clientY > rect.bottom - edgeZone) container.scrollTop += speed
      }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const row = el?.closest('[data-index]')
      if (row) {
        const idx = parseInt(row.getAttribute('data-index')!, 10)
        const next = dragMove(dsRef.current, idx)
        if (next !== dsRef.current) commitSelection(next)
      }
    }
    function onMouseUp() {
      pendingDrag.current = null
      if (dsRef.current.dragging) commitSelection(dragEnd(dsRef.current))
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [commitSelection])

  // Escape + Cmd+A — clear uses setSelection directly to avoid stale index issues
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && selection.size > 0) {
        dsRef.current = createDragSelectState()
        setSelection(new Set())
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !(e.target as HTMLElement).closest('input,textarea,select')) {
        e.preventDefault()
        setSelection(new Set(tickets.map(t => t.id)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection.size, tickets])

  // Scroll to highlighted row on keyboard nav
  useEffect(() => {
    virtualizer.scrollToIndex(highlightIndex, { align: 'auto' })
  }, [highlightIndex, virtualizer])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="flex flex-1 flex-col overflow-hidden select-none">
      {/* Column headers */}
      <div className="grid grid-cols-[28px_1fr_72px_96px_64px] items-center gap-0 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5">
        <div />
        <SortHeader field="title" label="Title" />
        <SortHeader field="priority" label="Pri" className="justify-center" />
        <SortHeader field="status" label="Status" className="justify-center" />
        <SortHeader field="created" label="Age" className="justify-end" />
      </div>

      {/* Selection info bar */}
      {selection.size > 0 && (
        <div className="flex items-center gap-3 border-b border-blue-500/20 bg-blue-500/[0.05] px-4 py-1">
          <span className="text-xs font-medium text-blue-400">{selection.size} selected</span>
          <button
            onClick={() => commitSelection(dragClear())}
            className="text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Virtual scroll container — wrapped in context menu */}
      <TicketContextMenu
        targetTickets={contextTargets}
        onSetStatus={handleSetStatus}
        onSetPriority={handleSetPriority}
        onCopyId={handleCopyId}
        onOpen={handleOpenTicket}
      >
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onMouseDown={handleContainerEvent}
        onClick={handleContainerEvent}
        onMouseMove={handleContainerEvent}
        onContextMenu={handleContextMenu}
      >
        {tickets.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-600">
            No tickets match your filters
          </div>
        ) : (
          <div
            className="relative will-change-transform"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualItems.map((vrow) => {
              const ticket = tickets[vrow.index]
              if (!ticket) return null

              return (
                <div
                  key={ticket.id}
                  className="absolute left-0 top-0 w-full"
                  style={{ height: ROW_HEIGHT, transform: `translateY(${vrow.start}px)` }}
                >
                  <ListRow
                    ticket={ticket}
                    index={vrow.index}
                    isHighlighted={vrow.index === highlightIndex}
                    isSelected={selection.has(ticket.id)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
      </TicketContextMenu>
    </div>
  )
}
