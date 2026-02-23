import { useRef, useCallback, useEffect, useState, forwardRef } from 'react'
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
import type { SortField, TicketSummary } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────

/** Estimated row height — actual height measured dynamically by virtualizer */
const ROW_HEIGHT_ESTIMATE = 36

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
      className={`flex items-center gap-0.5 text-[11px] uppercase tracking-wider transition-colors select-none ${
        active ? 'text-zinc-300' : 'text-zinc-600 hover:text-zinc-400'
      } ${className ?? ''}`}
    >
      {label}
      {active && (sortDir === 'asc' ? <CaretUp size={10} weight="bold" /> : <CaretDown size={10} weight="bold" />)}
    </button>
  )
}

// ── Single row ────────────────────────────────────────────────

const ListRow = forwardRef<HTMLDivElement, {
  ticket: TicketSummary
  index: number
  virtualIndex: number
  isHighlighted: boolean
  isSelected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onMouseEnter: (e: React.MouseEvent) => void
  onClick: () => void
  onStatusClick: (e: React.MouseEvent) => void
  onCheckboxClick: (e: React.MouseEvent) => void
  style: React.CSSProperties
}>(function ListRow({
  ticket,
  index,
  virtualIndex,
  isHighlighted,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onClick,
  onStatusClick,
  onCheckboxClick,
  style,
}, ref) {
  return (
    <div
      ref={ref}
      data-index={virtualIndex}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={style}
      className={`group/row absolute left-0 top-0 grid w-full cursor-default grid-cols-[28px_1fr_72px_96px_64px] items-center gap-0 border-b border-zinc-800/40 px-3 py-1 transition-colors duration-75 ${
        isSelected
          ? 'bg-blue-500/[0.07]'
          : isHighlighted
            ? 'bg-zinc-800/40'
            : 'hover:bg-zinc-800/25'
      }`}
    >
      {/* Checkbox */}
      <div
        onClick={onCheckboxClick}
        className={`flex items-center justify-center ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
        } transition-opacity duration-75`}
      >
        <div
          className={`flex size-4 items-center justify-center rounded border transition-all duration-75 ${
            isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-zinc-600 hover:border-zinc-400'
          }`}
        >
          {isSelected && <Check size={10} weight="bold" className="text-white" />}
        </div>
      </div>

      {/* Title + ID + Tags */}
      <div className="flex min-w-0 items-center gap-2">
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
      <div
        onClick={onStatusClick}
        className="flex cursor-pointer justify-center transition-opacity hover:opacity-80"
      >
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

  // Drag-select state lives in a ref for perf during mousemove
  const dsRef = useRef<DragSelectState>(createDragSelectState())
  const [selection, setSelection] = useState<Set<number>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Virtualizer with dynamic measurement
  const virtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 15,
    measureElement: (el) => el.getBoundingClientRect().height,
  })

  // Sync selection set to the UI store for bulk action bar
  const selectedIds = useUIStore(s => s.selectedIds)
  useEffect(() => {
    const ids = new Set<string>()
    for (const idx of selection) {
      if (tickets[idx]) ids.add(tickets[idx].id)
    }
    if (ids.size !== selectedIds.size || [...ids].some(id => !selectedIds.has(id))) {
      useUIStore.setState({ selectedIds: ids })
    }
  }, [selection, tickets])

  const commitSelection = useCallback((state: DragSelectState) => {
    dsRef.current = state
    setSelection(new Set(state.selection))
  }, [])

  // Global mousemove/mouseup during drag
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dsRef.current.dragging) return

      // Auto-scroll when near edges
      const container = scrollRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        const edgeZone = 40 // px from edge to trigger scroll
        const speed = 8
        if (e.clientY < rect.top + edgeZone) {
          container.scrollTop -= speed
        } else if (e.clientY > rect.bottom - edgeZone) {
          container.scrollTop += speed
        }
      }

      // Find row under cursor
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const row = el?.closest('[data-index]')
      if (row) {
        const idx = parseInt(row.getAttribute('data-index')!, 10)
        const next = dragMove(dsRef.current, idx)
        if (next !== dsRef.current) commitSelection(next)
      }
    }

    function onMouseUp() {
      if (dsRef.current.dragging) {
        commitSelection(dragEnd(dsRef.current))
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [commitSelection])

  // Keyboard: Escape clears selection, Cmd+A selects all
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && selection.size > 0) {
        commitSelection(dragClear())
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !(e.target as HTMLElement).closest('input,textarea,select')) {
        e.preventDefault()
        const all = new Set<number>()
        for (let i = 0; i < tickets.length; i++) all.add(i)
        commitSelection({
          dragging: false,
          anchorIndex: 0,
          currentIndex: tickets.length - 1,
          baseSelection: all,
          selection: all,
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection.size, tickets.length, commitSelection])

  // Scroll highlighted row into view via virtualizer
  useEffect(() => {
    virtualizer.scrollToIndex(highlightIndex, { align: 'auto', behavior: 'smooth' })
  }, [highlightIndex, virtualizer])

  const handleRowMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button, a, select, input')) return
    e.preventDefault()
    commitSelection(dragStart(dsRef.current, index, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey }))
  }, [commitSelection])

  const handleRowMouseEnter = useCallback((index: number) => {
    if (!dsRef.current.dragging) {
      setHighlightIndex(index)
    }
  }, [setHighlightIndex])

  const handleRowClick = useCallback((ticket: TicketSummary) => {
    if (dsRef.current.selection.size <= 1 && activeProjectId) {
      navigate(`/${activeProjectId}/ticket/${ticket.id}`)
    }
  }, [activeProjectId, navigate])

  const handleStatusClick = useCallback((e: React.MouseEvent, ticket: TicketSummary) => {
    e.stopPropagation()
    if (!activeProjectId) return
    const next = STATUS_CYCLE[ticket.status] ?? 'open'
    updateTicketStatus(activeProjectId, ticket.id, next)
  }, [activeProjectId, updateTicketStatus])

  const handleCheckboxClick = useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    commitSelection(dragStart(dsRef.current, index, { meta: true }))
  }, [commitSelection])

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div className="flex flex-1 flex-col overflow-hidden select-none">
      {/* Column headers */}
      <div className="grid grid-cols-[28px_1fr_72px_96px_64px] items-center gap-0 border-b border-zinc-800 bg-zinc-950 px-3 py-1.5">
        <div /> {/* checkbox col */}
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

      {/* Virtual scroll container */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {tickets.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-600">
            No tickets match your filters
          </div>
        ) : (
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
          >
            {virtualItems.map((virtualRow) => {
              const ticket = tickets[virtualRow.index]
              if (!ticket) return null
              const idx = virtualRow.index

              return (
                <ListRow
                  key={ticket.id}
                  ref={virtualizer.measureElement}
                  ticket={ticket}
                  index={idx}
                  virtualIndex={virtualRow.index}
                  isHighlighted={idx === highlightIndex}
                  isSelected={selection.has(idx)}
                  onMouseDown={(e) => handleRowMouseDown(idx, e)}
                  onMouseEnter={() => handleRowMouseEnter(idx)}
                  onClick={() => handleRowClick(ticket)}
                  onStatusClick={(e) => handleStatusClick(e, ticket)}
                  onCheckboxClick={(e) => handleCheckboxClick(e, idx)}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
