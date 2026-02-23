import { useMemo } from 'react'
import { useTicketStore } from '@/stores/ticket-store'
import { useViewStore } from '@/stores/view-store'
import { BoardColumn } from './board-column'
import type { SavedList, TicketSummary } from '@/lib/types'
import { applyFiltersAndSort } from '@/lib/filter-engine'

/**
 * Board view — renders saved view columns as side-by-side filtered lists.
 * Leftmost column wins: tickets are claimed left-to-right, no duplicates.
 */
export function BoardView() {
  const tickets = useTicketStore(s => s.tickets)
  const { views, activeViewId } = useViewStore()
  const activeView = views.find(v => v.id === activeViewId)

  const columns = activeView?.columns ?? []
  const sortOverride = activeView?.boardSort

  // Build exclusion sets: for each column, accumulate IDs claimed by prior columns
  const exclusionSets = useMemo(() => {
    const sets: Set<string>[] = []
    const claimed = new Set<string>()

    for (const col of columns) {
      // This column excludes everything claimed so far
      sets.push(new Set(claimed))

      // Compute what this column claims (for subsequent columns)
      const matched = applyFiltersAndSort({
        tickets: tickets.filter(t => !claimed.has(t.id)),
        filters: col.filters,
        sortField: sortOverride?.field ?? col.sortField,
        sortDir: sortOverride?.dir ?? col.sortDir,
      })
      for (const t of matched) claimed.add(t.id)
    }

    return sets
  }, [tickets, columns, sortOverride])

  if (columns.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        No columns configured for this board view
      </div>
    )
  }

  return (
    <div className="flex flex-1 gap-4 overflow-x-auto p-4">
      {columns.map((col, i) => (
        <BoardColumn
          key={`${col.name}-${i}`}
          list={col}
          allTickets={tickets}
          excludeIds={exclusionSets[i] ?? new Set()}
          sortOverride={sortOverride}
        />
      ))}
    </div>
  )
}
