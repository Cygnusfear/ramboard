import { create } from 'zustand'
import type { SortField, SortDir } from '@/lib/types'
import {
  type FilterSet,
  type FilterClause,
  type FilterField,
  type FilterOperator,
  createFilterId,
  FIELD_OPERATORS,
  getDefaultValue,
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

/** Mark view dirty when filter state changes via user action */
function notifyDirty() {
  // Dynamic import to avoid circular deps — view-store imports are lazy
  import('@/stores/view-store').then(m => m.useViewStore.getState().markDirty())
}

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
    notifyDirty()
    return id
  },

  updateFilter: (id, patch) => {
    set(s => ({
      filters: s.filters.map(f => (f.id === id ? { ...f, ...patch } : f)),
    }))
    notifyDirty()
  },

  removeFilter: (id) => {
    set(s => ({ filters: s.filters.filter(f => f.id !== id) }))
    notifyDirty()
  },

  clearFilters: () => { set({ filters: [], search: '' }); notifyDirty() },

  setSearch: (search) => { set({ search }); notifyDirty() },

  setSort: (field) => {
    set(s => ({
      sortField: field,
      sortDir: s.sortField === field && s.sortDir === 'asc' ? 'desc' : 'asc',
    }))
    notifyDirty()
  },
}))


