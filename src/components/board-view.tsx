import { useMemo, useCallback, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
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
import { BoardToolbar, type PresetDef } from './board-toolbar'
import { createFilterId, applyFiltersAndSort } from '@/lib/filter-engine'
import type { SavedList, SavedView, SortField } from '@/lib/types'
import { Plus, DotsSixVertical } from '@phosphor-icons/react'

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
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-72 shrink-0 flex-col ${isDragging ? 'opacity-0' : ''}`}
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
  const { views, activeViewId, saveView, updateViewLocal } = useViewStore()
  const { activeProjectId } = useProjectStore()
  const activeView = views.find(v => v.id === activeViewId)

  const columns = activeView?.columns ?? []
  const sortOverride = activeView?.boardSort

  const columnIds = useMemo(
    () => columns.map(c => c.id),
    [columns],
  )

  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const persistColumns = useCallback(
    async (newColumns: SavedList[]) => {
      if (!activeProjectId || !activeView) return
      await saveView(activeProjectId, { ...activeView, columns: newColumns })
    },
    [activeProjectId, activeView, saveView],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = columnIds.indexOf(active.id as string)
      const newIndex = columnIds.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(columns, oldIndex, newIndex)
      // Optimistic: update store immediately so UI reflects new order on drop
      if (activeViewId) updateViewLocal(activeViewId, { columns: reordered })
      // Persist in background
      persistColumns(reordered)
    },
    [columns, columnIds, persistColumns, activeViewId, updateViewLocal],
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
      id: createFilterId(),
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
          onDragStart={handleDragStart}
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

          {/* Floating ghost — follows cursor during drag */}
          <DragOverlay>
            {activeId != null && (() => {
              const idx = columnIds.indexOf(activeId)
              const col = columns[idx]
              if (!col) return null
              return (
                <div className="w-72 rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 shadow-2xl shadow-zinc-950/60">
                  <div className="mb-2 flex items-center gap-2">
                    <DotsSixVertical size={14} className="text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-200">{col.name}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {applyFiltersAndSort({ tickets, filters: col.filters, sortField: col.sortField, sortDir: col.sortDir }).length} tickets
                  </div>
                </div>
              )
            })()}
          </DragOverlay>
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
