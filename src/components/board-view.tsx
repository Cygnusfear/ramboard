import { useMemo, useCallback } from 'react'
import { useTicketStore } from '@/stores/ticket-store'
import { useViewStore } from '@/stores/view-store'
import { useProjectStore } from '@/stores/project-store'
import { BoardColumn } from './board-column'
import { ColumnEditor } from './column-editor'
import { applyFiltersAndSort, createFilterId } from '@/lib/filter-engine'
import type { SavedList, SavedView, SortField, SortDir } from '@/lib/types'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'
import {
  Plus,
  SortAscending,
  SortDescending,
  Lightning,
} from '@phosphor-icons/react'
import { Popover } from '@base-ui/react/popover'

// ── Presets ───────────────────────────────────────────────────

type PresetId = 'by-status' | 'by-type' | 'by-priority'

interface PresetDef {
  id: PresetId
  label: string
  generate: () => SavedList[]
}

const PRESETS: PresetDef[] = [
  {
    id: 'by-status',
    label: 'By Status',
    generate: () =>
      ['open', 'in_progress', 'closed'].map(s => ({
        name: STATUS_LABELS[s] ?? s,
        filters: [{ id: createFilterId(), field: 'status' as const, operator: 'any_of' as const, value: [s] }],
        sortField: 'priority' as SortField,
        sortDir: 'asc' as SortDir,
      })),
  },
  {
    id: 'by-type',
    label: 'By Type',
    generate: () =>
      ['bug', 'feature', 'task', 'chore', 'epic'].map(t => ({
        name: t.charAt(0).toUpperCase() + t.slice(1),
        filters: [{ id: createFilterId(), field: 'type' as const, operator: 'any_of' as const, value: [t] }],
        sortField: 'priority' as SortField,
        sortDir: 'asc' as SortDir,
      })),
  },
  {
    id: 'by-priority',
    label: 'By Priority',
    generate: () =>
      [0, 1, 2, 3].map(p => ({
        name: PRIORITY_LABELS[p],
        filters: [{ id: createFilterId(), field: 'priority' as const, operator: 'any_of' as const, value: [String(p)] }],
        sortField: 'created' as SortField,
        sortDir: 'desc' as SortDir,
      })),
  },
]

// ── Board toolbar ─────────────────────────────────────────────

function BoardToolbar({
  view,
  onApplyPreset,
  onToggleBoardSort,
}: {
  view: SavedView
  onApplyPreset: (preset: PresetDef) => void
  onToggleBoardSort: () => void
}) {
  const hasBoardSort = !!view.boardSort

  return (
    <div className="flex items-center gap-2 border-b border-zinc-800/50 px-4 py-2">
      {/* Presets */}
      <Popover.Root>
        <Popover.Trigger className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300">
          <Lightning size={12} />
          Presets
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} className="z-50">
            <Popover.Popup className="min-w-[140px] rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => onApplyPreset(p)}
                  className="flex w-full px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {p.label}
                </button>
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {/* Board-level sort toggle */}
      <button
        onClick={onToggleBoardSort}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
          hasBoardSort
            ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
            : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
        }`}
      >
        {view.boardSort?.dir === 'desc' ? <SortDescending size={12} /> : <SortAscending size={12} />}
        {hasBoardSort ? `Sort: ${view.boardSort!.field}` : 'Board sort'}
      </button>

      <span className="ml-auto text-[11px] text-zinc-600">
        {view.columns?.length ?? 0} columns
      </span>
    </div>
  )
}

// ── Main board ────────────────────────────────────────────────

export function BoardView() {
  const tickets = useTicketStore(s => s.tickets)
  const { views, activeViewId, saveView } = useViewStore()
  const { activeProjectId } = useProjectStore()
  const activeView = views.find(v => v.id === activeViewId)

  const columns = activeView?.columns ?? []
  const sortOverride = activeView?.boardSort

  // Leftmost-wins exclusion sets
  const exclusionSets = useMemo(() => {
    const sets: Set<string>[] = []
    const claimed = new Set<string>()

    for (const col of columns) {
      sets.push(new Set(claimed))
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

  // Persist column changes back to active view
  const persistColumns = useCallback(
    async (newColumns: SavedList[]) => {
      if (!activeProjectId || !activeView) return
      await saveView(activeProjectId, { ...activeView, columns: newColumns })
    },
    [activeProjectId, activeView, saveView],
  )

  const handleColumnUpdate = useCallback(
    (index: number, updated: SavedList) => {
      const next = [...columns]
      next[index] = updated
      persistColumns(next)
    },
    [columns, persistColumns],
  )

  const handleColumnDelete = useCallback(
    (index: number) => {
      persistColumns(columns.filter((_, i) => i !== index))
    },
    [columns, persistColumns],
  )

  const handleAddColumn = useCallback(() => {
    const newCol: SavedList = {
      name: `Column ${columns.length + 1}`,
      filters: [],
      sortField: 'priority',
      sortDir: 'asc',
    }
    persistColumns([...columns, newCol])
  }, [columns, persistColumns])

  const handleApplyPreset = useCallback(
    (preset: PresetDef) => {
      persistColumns(preset.generate())
    },
    [persistColumns],
  )

  const handleToggleBoardSort = useCallback(() => {
    if (!activeProjectId || !activeView) return
    const next: SavedView = { ...activeView }
    if (next.boardSort) {
      // Cycle: asc → desc → off
      if (next.boardSort.dir === 'asc') {
        next.boardSort = { ...next.boardSort, dir: 'desc' }
      } else {
        next.boardSort = undefined
      }
    } else {
      next.boardSort = { field: 'priority', dir: 'asc' }
    }
    saveView(activeProjectId, next)
  }, [activeProjectId, activeView, saveView])

  if (!activeView) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        No view selected
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <BoardToolbar
        view={activeView}
        onApplyPreset={handleApplyPreset}
        onToggleBoardSort={handleToggleBoardSort}
      />

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {columns.map((col, i) => (
          <div key={`${col.name}-${i}`} className="flex w-72 shrink-0 flex-col">
            <ColumnEditor
              column={col}
              onUpdate={updated => handleColumnUpdate(i, updated)}
              onDelete={() => handleColumnDelete(i)}
            >
              <BoardColumn
                list={col}
                allTickets={tickets}
                excludeIds={exclusionSets[i] ?? new Set()}
                sortOverride={sortOverride}
              />
            </ColumnEditor>
          </div>
        ))}

        {/* Add column */}
        <button
          onClick={handleAddColumn}
          className="flex h-fit w-72 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-800 py-8 text-xs text-zinc-600 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50 hover:text-zinc-400"
        >
          <Plus size={14} />
          Add column
        </button>
      </div>
    </div>
  )
}
