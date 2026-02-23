import { useUIStore } from '@/stores/ui-store'
import { useTicketStore } from '@/stores/ticket-store'
import { List, Kanban, MagnifyingGlass, Funnel } from '@phosphor-icons/react'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'

export function HeaderBar() {
  const { viewMode, setViewMode, setShowCommandPalette } = useUIStore()
  const { filterStatus, filterPriority, filterTag, setFilterStatus, setFilterPriority, setFilterTag, tickets } = useTicketStore()
  const filteredCount = useTicketStore(s => s.filteredTickets().length)

  // Collect all unique tags
  const allTags = [...new Set(tickets.flatMap(t => t.tags))].sort()

  return (
    <header className="flex h-11 items-center gap-3 border-b border-zinc-800 px-4">
      {/* View toggle */}
      <div className="flex rounded-lg border border-zinc-800 p-0.5">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
            viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <List size={14} />
          List
        </button>
        <button
          onClick={() => setViewMode('board')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
            viewMode === 'board' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Kanban size={14} />
          Board
        </button>
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Funnel size={14} className="text-zinc-500" />

        <select
          value={filterStatus || ''}
          onChange={e => setFilterStatus(e.target.value || null)}
          className="rounded-md border border-zinc-800 bg-transparent px-2 py-1 text-xs text-zinc-400 outline-none focus:border-blue-500"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={filterPriority ?? ''}
          onChange={e => setFilterPriority(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-zinc-800 bg-transparent px-2 py-1 text-xs text-zinc-400 outline-none focus:border-blue-500"
        >
          <option value="">All Priority</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          value={filterTag || ''}
          onChange={e => setFilterTag(e.target.value || null)}
          className="rounded-md border border-zinc-800 bg-transparent px-2 py-1 text-xs text-zinc-400 outline-none focus:border-blue-500"
        >
          <option value="">All Tags</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-zinc-500">{filteredCount} tickets</span>

        <button
          onClick={() => setShowCommandPalette(true)}
          className="flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
        >
          <MagnifyingGlass size={14} />
          <kbd className="font-mono text-[10px] text-zinc-600">⌘K</kbd>
        </button>
      </div>
    </header>
  )
}
