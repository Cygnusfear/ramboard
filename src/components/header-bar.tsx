import { useUIStore } from '@/stores/ui-store'
import { useFilterStore } from '@/stores/filter-store'
import { useFilteredTickets } from '@/hooks/use-filtered-tickets'
import { useTicketStore } from '@/stores/ticket-store'
import { FilterBar } from './filter-bar'
import { List, Kanban } from '@phosphor-icons/react'

export function HeaderBar() {
  const { viewMode, setViewMode, setShowCommandPalette } = useUIStore()
  const filtered = useFilteredTickets()
  const total = useTicketStore(s => s.tickets.length)
  const hasFilters = useFilterStore(s => s.filters.length > 0 || s.search.length > 0)

  return (
    <header className="border-b border-zinc-800">
      {/* Top row — view toggle + meta */}
      <div className="flex h-11 items-center gap-3 px-4">
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

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {hasFilters ? `${filtered.length} of ${total}` : `${total} tickets`}
          </span>

          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
          >
            <kbd className="font-mono text-[10px] text-zinc-600">⌘K</kbd>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar />
    </header>
  )
}
