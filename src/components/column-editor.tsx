/**
 * Column editor popover — inline editing of a board column's name, filters, and sort.
 * Reuses the same filter editing patterns as filter-bar.tsx (operator selector,
 * multi-select with search, date presets, text input).
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
  DATE_PRESETS,
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

function labelForOption(field: FilterField, val: string): string {
  if (field === 'status') return STATUS_LABELS[val] ?? val
  if (field === 'priority') return PRIORITY_LABELS[Number(val)] ?? `P${val}`
  return val
}

// ── Filter row — full editor with operator + value ────────────

function FilterRow({
  clause,
  onUpdate,
  onRemove,
}: {
  clause: FilterClause
  onUpdate: (patch: Partial<FilterClause>) => void
  onRemove: () => void
}) {
  const tickets = useTicketStore(s => s.tickets)
  const operators = FIELD_OPERATORS[clause.field]
  const options = uniqueFieldValues(tickets, clause.field)

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
      {/* Header: field name + remove */}
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-400">{FIELD_LABELS[clause.field]}</span>
        <button onClick={onRemove} className="text-zinc-600 hover:text-zinc-300">
          <X size={10} />
        </button>
      </div>

      {/* Operator selector */}
      <div className="mb-2 flex flex-wrap gap-1">
        {operators.map(op => (
          <button
            key={op}
            onClick={() => onUpdate({ operator: op })}
            className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
              clause.operator === op
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {OPERATOR_LABELS[op]}
          </button>
        ))}
      </div>

      {/* Value editor — field-type-dependent */}
      {clause.field === 'created' ? (
        <DateValueEditor clause={clause} onUpdate={onUpdate} />
      ) : clause.field === 'title' ? (
        <TextValueEditor clause={clause} onUpdate={onUpdate} />
      ) : (
        <MultiSelectEditor clause={clause} options={options} onUpdate={onUpdate} />
      )}
    </div>
  )
}

// ── Multi-select value editor ─────────────────────────────────

function MultiSelectEditor({
  clause,
  options,
  onUpdate,
}: {
  clause: FilterClause
  options: string[]
  onUpdate: (patch: Partial<FilterClause>) => void
}) {
  const selected = Array.isArray(clause.value) ? (clause.value as string[]).map(String) : []
  const [search, setSearch] = useState('')

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val]
    onUpdate({ value: next })
  }

  return (
    <div>
      {options.length > 6 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="mb-1.5 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
        />
      )}
      <div className="flex max-h-[140px] flex-col gap-0.5 overflow-auto">
        {filtered.map(opt => {
          const checked = selected.includes(opt)
          return (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
            >
              <Checkbox.Root
                checked={checked}
                onCheckedChange={() => toggle(opt)}
                className="flex size-3 items-center justify-center rounded-sm border border-zinc-600 data-[checked]:border-blue-500 data-[checked]:bg-blue-500"
              >
                <Checkbox.Indicator className="flex text-white data-[unchecked]:hidden">
                  <Check size={8} weight="bold" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span>{labelForOption(clause.field, opt)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── Date value editor ─────────────────────────────────────────

function DateValueEditor({
  clause,
  onUpdate,
}: {
  clause: FilterClause
  onUpdate: (patch: Partial<FilterClause>) => void
}) {
  if (clause.operator === 'last_n_days' || clause.operator === 'older_than' || clause.operator === 'newer_than') {
    return (
      <div className="flex flex-col gap-0.5">
        {DATE_PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => onUpdate({ value: p.days })}
            className={`rounded px-2 py-0.5 text-left text-[11px] transition-colors ${
              clause.value === p.days
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    )
  }

  if (clause.operator === 'between') {
    const [start, end] = Array.isArray(clause.value) ? (clause.value as [string, string]) : ['', '']
    return (
      <div className="flex flex-col gap-1">
        <input
          type="date"
          value={start}
          onChange={e => onUpdate({ value: [e.target.value, end] })}
          className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-200 outline-none focus:border-zinc-600"
        />
        <input
          type="date"
          value={end}
          onChange={e => onUpdate({ value: [start, e.target.value] })}
          className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-200 outline-none focus:border-zinc-600"
        />
      </div>
    )
  }

  return (
    <input
      type="date"
      value={typeof clause.value === 'string' ? clause.value : ''}
      onChange={e => onUpdate({ value: e.target.value })}
      className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-200 outline-none focus:border-zinc-600"
    />
  )
}

// ── Text value editor ─────────────────────────────────────────

function TextValueEditor({
  clause,
  onUpdate,
}: {
  clause: FilterClause
  onUpdate: (patch: Partial<FilterClause>) => void
}) {
  return (
    <input
      value={typeof clause.value === 'string' ? clause.value : ''}
      onChange={e => onUpdate({ value: e.target.value })}
      placeholder="Search text..."
      className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
    />
  )
}

// ── Add filter field picker ───────────────────────────────────

function AddFilterButton({ onAdd }: { onAdd: (field: FilterField) => void }) {
  const [open, setOpen] = useState(false)
  const fields: FilterField[] = ['status', 'priority', 'type', 'tag', 'assignee', 'created', 'title']

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300">
        <Plus size={10} />
        Filter
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} className="z-[60]">
          <Popover.Popup className="rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl">
            {fields.map(f => (
              <button
                key={f}
                onClick={() => { onAdd(f); setOpen(false) }}
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
  children: React.ReactNode
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
    const defaultValue = field === 'created' ? 30
      : field === 'title' ? ''
      : field === 'status' ? ['open']
      : field === 'priority' ? ['2']
      : []
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
          <Popover.Popup className="w-[300px] rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl shadow-zinc-950/80">
            {/* Name */}
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="mb-3 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600"
              placeholder="Column name"
              autoFocus
            />

            {/* Filters */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-500">Filters</span>
                <AddFilterButton onAdd={addFilter} />
              </div>
              {filters.length === 0 && (
                <div className="py-2 text-center text-[11px] text-zinc-600">
                  No filters — shows all tickets
                </div>
              )}
              {filters.map(f => (
                <FilterRow
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
                onClick={() => { onDelete(); setEditing(false) }}
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
