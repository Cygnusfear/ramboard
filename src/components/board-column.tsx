import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useProjectStore } from '@/stores/project-store'
import { useLocation } from 'wouter'
import { PriorityIcon } from './priority-icon'
import { StatusDot } from './status-dot'
import { TagList } from './tag-pill'
import { applyFiltersAndSort } from '@/lib/filter-engine'
import type { SavedList, TicketSummary } from '@/lib/types'

// ── Card ──────────────────────────────────────────────────────

function BoardCard({ ticket }: { ticket: TicketSummary }) {
  const { activeProjectId } = useProjectStore()
  const [, navigate] = useLocation()

  return (
    <div
      onClick={() => activeProjectId && navigate(`/${activeProjectId}/ticket/${ticket.id}`)}
      className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/80"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-zinc-500">{ticket.id}</span>
        <StatusDot status={ticket.status} />
      </div>
      <div className="mb-2 line-clamp-2 text-sm leading-snug text-zinc-200">{ticket.title}</div>
      <div className="flex items-center justify-between">
        <PriorityIcon priority={ticket.priority} />
        {ticket.tags.length > 0 && <TagList tags={ticket.tags} max={2} />}
      </div>
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────

const CARD_HEIGHT = 108 // estimated card height for virtualizer
const CARD_GAP = 8

interface BoardColumnProps {
  list: SavedList
  allTickets: TicketSummary[]
  /** Ticket IDs already claimed by columns to the left */
  excludeIds: Set<string>
  /** Board-level sort override */
  sortOverride?: { field: SavedList['sortField']; dir: SavedList['sortDir'] }
}

export function BoardColumn({ list, allTickets, excludeIds, sortOverride }: BoardColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const tickets = useMemo(() => {
    // Filter using the pure engine, then exclude already-claimed IDs
    const available = allTickets.filter(t => !excludeIds.has(t.id))
    return applyFiltersAndSort({
      tickets: available,
      filters: list.filters,
      sortField: sortOverride?.field ?? list.sortField,
      sortDir: sortOverride?.dir ?? list.sortDir,
    })
  }, [allTickets, list, excludeIds, sortOverride])

  const virtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 5,
  })

  return (
    <div className="flex w-72 shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-xs font-medium text-zinc-300">{list.name}</span>
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
          {tickets.length}
        </span>
      </div>

      {/* Scrollable card list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto rounded-lg bg-zinc-900/30 p-2"
      >
        {tickets.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-600">No tickets</div>
        ) : (
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map(vrow => {
              const ticket = tickets[vrow.index]
              if (!ticket) return null
              return (
                <div
                  key={ticket.id}
                  className="absolute left-0 top-0 w-full pb-2"
                  style={{ height: vrow.size, transform: `translateY(${vrow.start}px)` }}
                >
                  <BoardCard ticket={ticket} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
