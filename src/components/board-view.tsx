import { useMemo, useCallback, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTicketStore } from '@/stores/ticket-store'
import { useViewStore } from '@/stores/view-store'
import { useProjectStore } from '@/stores/project-store'
import { BoardColumn } from './board-column'
import { ColumnEditor } from './column-editor'
import { createFilterId } from '@/lib/filter-engine'
import type { SavedList, SavedView, SortField, SortDir } from '@/lib/types'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'
import {
  Plus,
  SortAscending,
  SortDescending,
  Lightning,
  Check,
  DotsSixVertical,
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
  onSetBoardSortField,
}: {
  view: SavedView
  onApplyPreset: (preset: PresetDef) => void
  onToggleBoardSort: () => void
  onSetBoardSortField: (field: SortField) => void
}) {
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const hasBoardSort = !!view.boardSort

  return (
    <div className="flex items-center gap-2 border-b border-zinc-800/50 px-4 py-2">
      <Popover.Root open={presetsOpen} onOpenChange={setPresetsOpen}>
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
                  onClick={() => { onApplyPreset(p); setPresetsOpen(false) }}
                  className="flex w-full px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {p.label}
                </button>
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root open={sortOpen} onOpenChange={setSortOpen}>
        <Popover.Trigger
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
            hasBoardSort
              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          {view.boardSort?.dir === 'desc' ? <SortDescending size={12} /> : <SortAscending size={12} />}
          {hasBoardSort ? `Sort: ${view.boardSort!.field}` : 'Board sort'}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} className="z-50">
            <Popover.Popup className="w-[180px] rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
              <span className="mb-1.5 block text-[11px] font-medium text-zinc-500">Sort all columns by</span>
              {SORT_FIELD_OPTIONS.map(sf => (
                <button
                  key={sf.value}
                  onClick={() => { onSetBoardSortField(sf.value); setSortOpen(false) }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-zinc-800 ${
                    view.boardSort?.field === sf.value ? 'text-blue-400' : 'text-zinc-400'
                  }`}
                >
                  {sf.label}
                  {view.boardSort?.field === sf.value && <Check size={10} className="ml-auto" />}
                </button>
              ))}
              <div className="my-1.5 border-t border-zinc-800" />
              <div className="flex gap-1">
                <button
                  onClick={() => { onToggleBoardSort(); setSortOpen(false) }}
                  className="flex-1 rounded px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                >
                  {hasBoardSort ? 'Toggle direction' : 'Enable'}
                </button>
                {hasBoardSort && (
                  <button
                    onClick={() => { onSetBoardSortField('__clear__' as SortField); setSortOpen(false) }}
                    className="rounded px-2 py-1 text-[11px] text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                  >
                    Clear
                  </button>
                )}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      <span className="ml-auto text-[11px] text-zinc-600">
        {view.columns?.length ?? 0} columns
      </span>
    </div>
  )
}

const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created' },
  { value: 'modified', label: 'Modified' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Title' },
]

// ── Sortable column wrapper ───────────────────────────────────

function SortableColumn({
  id,
  col,
  index,
  tickets,
  sortOverride,
  onUpdate,
  onDelete,
}: {
  id: string
  col: SavedList
  index: number
  tickets: import('@/lib/types').TicketSummary[]
  sortOverride?: SavedView['boardSort']
  onUpdate: (index: number, updated: SavedList) => void
  onDelete: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-72 shrink-0 flex-col"
    >
      <ColumnEditor
        column={col}
        onUpdate={updated => onUpdate(index, updated)}
        onDelete={() => onDelete(index)}
      >
        <BoardColumn
          list={col}
          allTickets={tickets}
          sortOverride={sortOverride}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </ColumnEditor>
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

  // Stable IDs for sortable — index-based since SavedList has no id
  const columnIds = useMemo(
    () => columns.map((_, i) => `col-${i}`),
    [columns.length], // regenerate only when count changes
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const persistColumns = useCallback(
    async (newColumns: SavedList[]) => {
      if (!activeProjectId || !activeView) return
      await saveView(activeProjectId, { ...activeView, columns: newColumns })
    },
    [activeProjectId, activeView, saveView],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = columnIds.indexOf(active.id as string)
      const newIndex = columnIds.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return

      persistColumns(arrayMove(columns, oldIndex, newIndex))
    },
    [columns, columnIds, persistColumns],
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
      next.boardSort = { ...next.boardSort, dir: next.boardSort.dir === 'asc' ? 'desc' : 'asc' }
    } else {
      next.boardSort = { field: 'priority', dir: 'asc' }
    }
    saveView(activeProjectId, next)
  }, [activeProjectId, activeView, saveView])

  const handleSetBoardSortField = useCallback((field: SortField) => {
    if (!activeProjectId || !activeView) return
    const next: SavedView = { ...activeView }
    if ((field as string) === '__clear__') {
      next.boardSort = null as unknown as undefined
      saveView(activeProjectId, next)
    } else {
      next.boardSort = { field, dir: next.boardSort?.dir ?? 'asc' }
      saveView(activeProjectId, next)
    }
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
        onSetBoardSortField={handleSetBoardSortField}
      />

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((col, i) => (
              <SortableColumn
                key={columnIds[i]}
                id={columnIds[i]}
                col={col}
                index={i}
                tickets={tickets}
                sortOverride={sortOverride}
                onUpdate={handleColumnUpdate}
                onDelete={handleColumnDelete}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add column — outside DndContext */}
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
