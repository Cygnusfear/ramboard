import { useTicketStore } from '@/stores/ticket-store'
import { useUIStore } from '@/stores/ui-store'
import { useProjectStore } from '@/stores/project-store'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'
import { TagList } from './tag-pill'
import {
  CaretUp,
  CaretDown,
} from '@phosphor-icons/react'
import type { SortField } from '@/lib/types'

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

function SortHeader({ field, label }: { field: SortField; label: string }) {
  const { sortField, sortDir, setSort } = useTicketStore()
  const active = sortField === field

  return (
    <button
      onClick={() => setSort(field)}
      className={`flex items-center gap-1 text-xs uppercase tracking-wider transition-colors ${
        active ? 'text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'
      }`}
    >
      {label}
      {active && (sortDir === 'asc' ? <CaretUp size={10} /> : <CaretDown size={10} />)}
    </button>
  )
}

export function ListView() {
  const tickets = useTicketStore(s => s.filteredTickets())
  const { highlightIndex, selectedIds, toggleSelection } = useUIStore()
  const { activeProjectId } = useProjectStore()
  const { fetchTicketDetail } = useTicketStore()
  const { setHighlightIndex } = useUIStore()

  const handleRowClick = (ticketId: string) => {
    if (activeProjectId) {
      fetchTicketDetail(activeProjectId, ticketId)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Column headers */}
      <div className="sticky top-0 z-10 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 px-4 py-2 backdrop-blur-sm">
        <div className="w-5" /> {/* checkbox space */}
        <SortHeader field="title" label="Title" />
        <SortHeader field="priority" label="Priority" />
        <SortHeader field="status" label="Status" />
        <SortHeader field="created" label="Created" />
      </div>

      {/* Rows */}
      <div>
        {tickets.map((ticket, idx) => {
          const isHighlighted = idx === highlightIndex
          const isSelected = selectedIds.has(ticket.id)

          return (
            <div
              key={ticket.id}
              onClick={() => handleRowClick(ticket.id)}
              onMouseEnter={() => setHighlightIndex(idx)}
              style={{ '--i': idx } as React.CSSProperties}
              className={`group grid cursor-pointer grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-zinc-800/50 px-4 py-2.5 transition-colors duration-100 ${
                isSelected
                  ? 'bg-blue-500/10'
                  : isHighlighted
                    ? 'bg-zinc-800/50'
                    : 'hover:bg-zinc-800/30'
              }`}
            >
              {/* Checkbox */}
              <div
                onClick={e => { e.stopPropagation(); toggleSelection(ticket.id) }}
                className={`flex size-5 items-center justify-center rounded border transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-zinc-700 opacity-0 group-hover:opacity-100'
                }`}
              >
                {isSelected && (
                  <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Title + Tags */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{ticket.id}</span>
                  <span className="truncate text-sm text-zinc-200">{ticket.title}</span>
                </div>
                {ticket.tags.length > 0 && (
                  <div className="mt-1">
                    <TagList tags={ticket.tags} max={3} />
                  </div>
                )}
              </div>

              {/* Priority */}
              <PriorityIcon priority={ticket.priority} showLabel />

              {/* Status */}
              <StatusDot status={ticket.status} showLabel />

              {/* Created */}
              <span className="text-xs text-zinc-500">{timeAgo(ticket.created)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
