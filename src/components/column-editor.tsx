/**
 * Column editor popover — inline editing of a board column's name, filters, and sort.
 * Renders as a popover anchored to the column header.
 */
import { useState, useCallback } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Checkbox } from '@base-ui/react/checkbox'
import {
  type FilterField,
  type FilterOperator,
  FIELD_LABELS,
  FIELD_OPERATORS,
  OPERATOR_LABELS,
  uniqueFieldValues,
  createFilterId,
} from '@/lib/filter-engine'
import type { FilterClause } from '@/lib/filter-engine'
import type { SavedList, SortField, SortDir } from '@/lib/types'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'
import { useTicketStore } from '@/stores/ticket-store'
import {
  Plus,
  X,
  Check,
  Pencil,
  Trash,
  SortAscending,
  SortDescending,
} from '@phosphor-icons/react'

// ── Helpers ───────────────────────────────────────────────────

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Title' },

]

function getFieldValues(field: FilterField): { value: string; label: string }[] {
  if (field === 'status')
    return Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))
  if (field === 'priority')
    return [0, 1, 2, 3].map(p => ({ value: String(p), label: PRIORITY_LABELS[p] }))
  return []
}

// ── Mini filter row ───────────────────────────────────────────

function MiniFilterRow({
  clause,
  onUpdate,
  onRemove,
}: {
  clause: FilterClause
  onUpdate: (patch: Partial<FilterClause>) => void
  onRemove: () => void
}) {
  const tickets = useTicketStore(s => s.tickets)
  const values = clause.field === 'status' || clause.field === 'priority'
    ? getFieldValues(clause.field)
    : uniqueFieldValues(tickets, clause.field).map(v => ({ value: v, label: v }))

  const rawValues = Array.isArray(clause.value) ? clause.value.map(String) : [String(clause.value)]
  const selected = new Set(rawValues)

  const toggle = (val: string) => {
    const next = new Set(selected)
    next.has(val) ? next.delete(val) : next.add(val)
    onUpdate({ value: [...next] as string[] })
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">
          {FIELD_LABELS[clause.field]} {OPERATOR_LABELS[clause.operator]}
        </span>
        <button onClick={onRemove} className="text-zinc-600 hover:text-zinc-300">
          <X size={10} />
        </button>
      </div>
      <div className="flex max-h-[120px] flex-col gap-0.5 overflow-auto">
        {values.map(v => (
          <label
            key={v.value}
            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <Checkbox.Root
              checked={selected.has(v.value)}
              onCheckedChange={() => toggle(v.value)}
              className="flex size-3.5 items-center justify-center rounded border border-zinc-600 data-[checked]:border-blue-500 data-[checked]:bg-blue-500"
            >
              <Checkbox.Indicator>
                <Check size={10} className="text-white" />
              </Checkbox.Indicator>
            </Checkbox.Root>
            {v.label}
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Add filter button ─────────────────────────────────────────

function AddFilterButton({ onAdd }: { onAdd: (field: FilterField) => void }) {
  const fields: FilterField[] = ['status', 'priority', 'type', 'tag', 'assignee']

  return (
    <Popover.Root>
      <Popover.Trigger className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300">
        <Plus size={10} />
        Filter
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} className="z-50">
          <Popover.Popup className="rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
            {fields.map(f => (
              <button
                key={f}
                onClick={() => onAdd(f)}
                className="flex w-full px-3 py-1 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                {FIELD_LABELS[f]}
              </button>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Main editor ───────────────────────────────────────────────

interface ColumnEditorProps {
  column: SavedList
  onUpdate: (updated: SavedList) => void
  onDelete: () => void
  children: React.ReactNode // trigger element
}

export function ColumnEditor({ column, onUpdate, onDelete, children }: ColumnEditorProps) {
  const [name, setName] = useState(column.name)
  const [filters, setFilters] = useState<FilterClause[]>(column.filters)
  const [sortField, setSortField] = useState<SortField>(column.sortField)
  const [sortDir, setSortDir] = useState<SortDir>(column.sortDir)
  const [editing, setEditing] = useState(false)

  const handleSave = useCallback(() => {
    onUpdate({ name: name.trim() || column.name, filters, sortField, sortDir })
    setEditing(false)
  }, [name, filters, sortField, sortDir, column.name, onUpdate])

  const addFilter = (field: FilterField) => {
    const op: FilterOperator = FIELD_OPERATORS[field][0]
    const defaultValue = field === 'status' ? ['open'] : field === 'priority' ? ['2'] : []
    setFilters(prev => [...prev, { id: createFilterId(), field, operator: op, value: defaultValue }])
  }

  const updateFilter = (id: string, patch: Partial<FilterClause>) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  const removeFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id))
  }

  return (
    <Popover.Root
      open={editing}
      onOpenChange={(open) => {
        setEditing(open)
        if (open) {
          // Reset to current column state on open
          setName(column.name)
          setFilters(column.filters)
          setSortField(column.sortField)
          setSortDir(column.sortDir)
        }
      }}
    >
      <Popover.Trigger render={(props) => <span {...props}>{children}</span>} />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} className="z-50">
          <Popover.Popup className="w-[280px] rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl shadow-zinc-950/80">
            {/* Name */}
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mb-3 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
              placeholder="Column name"
            />

            {/* Filters */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-500">Filters</span>
                <AddFilterButton onAdd={addFilter} />
              </div>
              {filters.length === 0 && (
                <div className="py-2 text-center text-[11px] text-zinc-600">No filters — shows all tickets</div>
              )}
              {filters.map(f => (
                <MiniFilterRow
                  key={f.id}
                  clause={f}
                  onUpdate={patch => updateFilter(f.id, patch)}
                  onRemove={() => removeFilter(f.id)}
                />
              ))}
            </div>

            {/* Sort */}
            <div className="mb-3">
              <span className="mb-1.5 block text-[11px] font-medium text-zinc-500">Sort</span>
              <div className="flex gap-1.5">
                <select
                  value={sortField}
                  onChange={e => setSortField(e.target.value as SortField)}
                  className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 outline-none"
                >
                  {SORT_FIELDS.map(sf => (
                    <option key={sf.value} value={sf.value}>{sf.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="rounded-md border border-zinc-800 px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  {sortDir === 'asc' ? <SortAscending size={14} /> : <SortDescending size={14} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
              <button
                onClick={onDelete}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash size={12} />
                Delete
              </button>
              <button
                onClick={handleSave}
                className="rounded-md bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/25"
              >
                Apply
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
