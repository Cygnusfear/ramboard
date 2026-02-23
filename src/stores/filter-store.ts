import { create } from 'zustand'
import type { SortField, SortDir } from '@/lib/types'
import {
  type FilterSet,
  type FilterClause,
  type FilterField,
  type FilterOperator,
  createFilterId,
  FIELD_OPERATORS,
} from '@/lib/filter-engine'

interface FilterState {
  /** Active filter clauses (AND'd together) */
  filters: FilterSet
  /** Quick text search */
  search: string
  /** Sort */
  sortField: SortField
  sortDir: SortDir

  // ── Actions ─────────────────────────────────────
  addFilter: (field: FilterField, operator?: FilterOperator, value?: FilterClause['value']) => string
  updateFilter: (id: string, patch: Partial<Pick<FilterClause, 'operator' | 'value'>>) => void
  removeFilter: (id: string) => void
  clearFilters: () => void
  setSearch: (search: string) => void
  setSort: (field: SortField) => void
}

/** Default filter: show only open + in_progress tickets */
const DEFAULT_FILTERS: FilterSet = [
  { id: 'default-status', field: 'status', operator: 'any_of', value: ['open', 'in_progress'] },
]

export const useFilterStore = create<FilterState>((set) => ({
  filters: DEFAULT_FILTERS,
  search: '',
  sortField: 'priority',
  sortDir: 'asc',

  addFilter: (field, operator, value) => {
    const id = createFilterId()
    const op = operator ?? FIELD_OPERATORS[field][0]
    const defaultValue = getDefaultValue(field, op)
    const clause: FilterClause = { id, field, operator: op, value: value ?? defaultValue }
    set(s => ({ filters: [...s.filters, clause] }))
    return id
  },

  updateFilter: (id, patch) =>
    set(s => ({
      filters: s.filters.map(f => (f.id === id ? { ...f, ...patch } : f)),
    })),

  removeFilter: (id) =>
    set(s => ({ filters: s.filters.filter(f => f.id !== id) })),

  clearFilters: () => set({ filters: [], search: '' }),

  setSearch: (search) => set({ search }),

  setSort: (field) =>
    set(s => ({
      sortField: field,
      sortDir: s.sortField === field && s.sortDir === 'asc' ? 'desc' : 'asc',
    })),
}))

function getDefaultValue(field: FilterField, operator: FilterOperator): FilterClause['value'] {
  switch (operator) {
    case 'any_of':
    case 'none_of':
      return []
    case 'between':
      return ['', '']
    case 'last_n_days':
      return 7
    case 'contains':
    case 'is':
    case 'is_not':
    case 'before':
    case 'after':
      return ''
    default:
      return ''
  }
}
