import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Checkbox } from '@base-ui/react/checkbox'
import { useFilterStore } from '@/stores/filter-store'
import { useTicketStore } from '@/stores/ticket-store'
import {
  type FilterField,
  type FilterClause,
  type FilterOperator,
  FIELD_LABELS,
  FIELD_OPERATORS,
  OPERATOR_LABELS,
  DATE_PRESETS,
  uniqueFieldValues,
} from '@/lib/filter-engine'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'
import { Plus, X, MagnifyingGlass, Check, FunnelSimple } from '@phosphor-icons/react'

// ── Filter chip (shows one active filter) ─────────────────────

function FilterChip({ clause }: { clause: FilterClause }) {
  const { updateFilter, removeFilter } = useFilterStore()
  const tickets = useTicketStore(s => s.tickets)

  const valueLabel = formatValue(clause)

  return (
    <Popover.Root>
      <Popover.Trigger
        className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 data-[popup-open]:border-zinc-600 data-[popup-open]:bg-zinc-800"
      >
        <span className="text-zinc-500">{FIELD_LABELS[clause.field]}</span>
        <span className="text-zinc-600">{OPERATOR_LABELS[clause.operator]}</span>
        <span className="max-w-[180px] truncate font-medium">{valueLabel}</span>
        <X
          size={12}
          className="ml-1 text-zinc-500 hover:text-zinc-200"
          onClick={e => { e.stopPropagation(); removeFilter(clause.id) }}
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className="min-w-[240px] origin-[var(--transform-origin)] rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <FilterEditor
              clause={clause}
              tickets={tickets}
              onUpdate={(patch) => updateFilter(clause.id, patch)}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Filter editor dropdown ────────────────────────────────────

function FilterEditor({
  clause,
  tickets,
  onUpdate,
}: {
  clause: FilterClause
  tickets: import('@/lib/types').TicketSummary[]
  onUpdate: (patch: Partial<Pick<FilterClause, 'operator' | 'value'>>) => void
}) {
  const operators = FIELD_OPERATORS[clause.field]
  const options = uniqueFieldValues(tickets, clause.field)

  return (
    <div>
      {/* Operator selector */}
      <div className="mb-2 flex gap-1">
        {operators.map(op => (
          <button
            key={op}
            onClick={() => onUpdate({ operator: op })}
            className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
              clause.operator === op
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {OPERATOR_LABELS[op]}
          </button>
        ))}
      </div>

      {/* Value editor — depends on field type */}
      {clause.field === 'created' ? (
        <DateValueEditor clause={clause} onUpdate={onUpdate} />
      ) : clause.field === 'title' ? (
        <TextValueEditor clause={clause} onUpdate={onUpdate} />
      ) : (
        <MultiSelectEditor
          clause={clause}
          options={options}
          onUpdate={onUpdate}
        />
      )}
    </div>
  )
}

// ── Multi-select (status, priority, type, tag, assignee) ──────

function MultiSelectEditor({
  clause,
  options,
  onUpdate,
}: {
  clause: FilterClause
  options: string[]
  onUpdate: (patch: Partial<Pick<FilterClause, 'value'>>) => void
}) {
  const selected = Array.isArray(clause.value) ? (clause.value as string[]) : []
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
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="mb-2 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-blue-500"
        />
      )}
      <div className="max-h-[200px] overflow-auto">
        {filtered.map(opt => {
          const checked = selected.includes(opt)
          return (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              <Checkbox.Root
                checked={checked}
                onCheckedChange={() => toggle(opt)}
                className="flex size-4 items-center justify-center rounded-sm border border-zinc-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 data-[checked]:border-blue-500 data-[checked]:bg-blue-500"
              >
                <Checkbox.Indicator className="flex text-white data-[unchecked]:hidden">
                  <Check size={10} weight="bold" />
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
  onUpdate: (patch: Partial<Pick<FilterClause, 'operator' | 'value'>>) => void
}) {
  if (clause.operator === 'last_n_days' || clause.operator === 'older_than' || clause.operator === 'newer_than') {
    return (
      <div className="flex flex-col gap-1">
        {DATE_PRESETS.map(p => (
          <button
            key={p.days}
            onClick={() => onUpdate({ value: p.days })}
            className={`rounded px-2 py-1 text-left text-xs transition-colors ${
              clause.value === p.days
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
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
      <div className="flex flex-col gap-2">
        <label className="text-[11px] text-zinc-500">From</label>
        <input
          type="date"
          value={start}
          onChange={e => onUpdate({ value: [e.target.value, end] })}
          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500"
        />
        <label className="text-[11px] text-zinc-500">To</label>
        <input
          type="date"
          value={end}
          onChange={e => onUpdate({ value: [start, e.target.value] })}
          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500"
        />
      </div>
    )
  }

  // before / after — single date
  return (
    <input
      type="date"
      value={typeof clause.value === 'string' ? clause.value : ''}
      onChange={e => onUpdate({ value: e.target.value })}
      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500"
    />
  )
}

// ── Text value editor ─────────────────────────────────────────

function TextValueEditor({
  clause,
  onUpdate,
}: {
  clause: FilterClause
  onUpdate: (patch: Partial<Pick<FilterClause, 'value'>>) => void
}) {
  return (
    <input
      autoFocus
      value={typeof clause.value === 'string' ? clause.value : ''}
      onChange={e => onUpdate({ value: e.target.value })}
      placeholder="Search text..."
      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-blue-500"
    />
  )
}

// ── Add filter button ─────────────────────────────────────────

function AddFilterButton() {
  const { addFilter } = useFilterStore()

  const fields: FilterField[] = ['status', 'priority', 'type', 'tag', 'assignee', 'created', 'title']

  return (
    <Popover.Root>
      <Popover.Trigger
        className="flex items-center gap-1 rounded-md border border-dashed border-zinc-700 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300 data-[popup-open]:border-zinc-500 data-[popup-open]:text-zinc-300"
      >
        <Plus size={12} />
        Filter
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className="min-w-[160px] origin-[var(--transform-origin)] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            {fields.map(field => (
              <Popover.Close
                key={field}
                onClick={() => addFilter(field)}
                className="flex w-full items-center px-3 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                {FIELD_LABELS[field]}
              </Popover.Close>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Main filter bar ───────────────────────────────────────────

export function FilterBar() {
  const { filters, search, setSearch, clearFilters } = useFilterStore()
  const hasFilters = filters.length > 0 || search.length > 0

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-1.5">
      {/* Search */}
      <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1 focus-within:border-blue-500">
        <MagnifyingGlass size={13} className="text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="w-32 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:w-48 transition-all"
        />
        {search && (
          <X
            size={12}
            className="cursor-pointer text-zinc-500 hover:text-zinc-200"
            onClick={() => setSearch('')}
          />
        )}
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      {/* Active filter chips */}
      {filters.map(clause => (
        <FilterChip key={clause.id} clause={clause} />
      ))}

      {/* Add filter */}
      <AddFilterButton />

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="ml-1 flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <FunnelSimple size={12} />
          Clear
        </button>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function formatValue(clause: FilterClause): string {
  const { field, operator, value } = clause

  if (operator === 'last_n_days' && typeof value === 'number') {
    const preset = DATE_PRESETS.find(p => p.days === value)
    return preset ? preset.label.toLowerCase() : `${value}d`
  }

  if (operator === 'between' && Array.isArray(value)) {
    const [s, e] = value as [string, string]
    return s && e ? `${s} – ${e}` : '...'
  }

  if (Array.isArray(value)) {
    const labels = (value as string[]).map(v => labelForOption(field, v))
    if (labels.length === 0) return '...'
    if (labels.length <= 2) return labels.join(', ')
    return `${labels[0]}, ${labels[1]} +${labels.length - 2}`
  }

  if (typeof value === 'string') {
    if (!value) return '...'
    return labelForOption(field, value)
  }

  return String(value)
}

function labelForOption(field: FilterField, val: string): string {
  switch (field) {
    case 'status': return STATUS_LABELS[val] ?? val
    case 'priority': return PRIORITY_LABELS[Number(val)] ?? `P${val}`
    default: return val
  }
}
