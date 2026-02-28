/**
 * Pure filter engine — no React, no stores.
 * Evaluates composite filters against ticket data.
 */
import type { TicketSummary, SortField, SortDir } from './types'

// ── Filter types ──────────────────────────────────────────────

export type FilterField = 'status' | 'priority' | 'type' | 'tag' | 'assignee' | 'created' | 'modified' | 'title'

export type FilterOperator =
  | 'is'           // exact match (single value)
  | 'is_not'       // not equal
  | 'any_of'       // value is in list
  | 'none_of'      // value is not in list
  | 'contains'     // substring match (text fields)
  | 'before'       // date < value
  | 'after'        // date > value
  | 'between'      // date between [start, end]
  | 'last_n_days'  // created within last N days
  | 'older_than'   // created more than N days ago
  | 'newer_than'   // created less than N days ago

export interface FilterClause {
  id: string
  field: FilterField
  operator: FilterOperator
  value: string | number | string[] | number[] | [string, string]
}

/** All clauses are AND'd together */
export type FilterSet = FilterClause[]

// ── Operator definitions per field ────────────────────────────

/** All available filter fields in display order */
export const FILTER_FIELDS: FilterField[] = ['status', 'priority', 'type', 'tag', 'assignee', 'created', 'modified', 'title']

export const FIELD_OPERATORS: Record<FilterField, FilterOperator[]> = {
  status:   ['any_of', 'none_of'],
  priority: ['any_of', 'none_of'],
  type:     ['any_of', 'none_of'],
  tag:      ['any_of', 'none_of'],
  assignee: ['is', 'is_not', 'any_of', 'none_of'],
  created:  ['newer_than', 'older_than', 'last_n_days', 'before', 'after', 'between'],
  modified: ['newer_than', 'older_than', 'last_n_days', 'before', 'after', 'between'],
  title:    ['contains'],
}

export const FIELD_LABELS: Record<FilterField, string> = {
  status: 'Status',
  priority: 'Priority',
  type: 'Type',
  tag: 'Tag',
  assignee: 'Assignee',
  created: 'Created',
  modified: 'Modified',
  title: 'Title',
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: 'is',
  is_not: 'is not',
  any_of: 'is any of',
  none_of: 'is none of',
  contains: 'contains',
  before: 'before',
  after: 'after',
  between: 'between',
  last_n_days: 'in last',
  older_than: 'older than',
  newer_than: 'newer than',
}

// ── Date presets ──────────────────────────────────────────────

export const DATE_PRESETS = [
  { label: '4 hours', days: 4 / 24 },
  { label: '8 hours', days: 8 / 24 },
  { label: '12 hours', days: 0.5 },
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
] as const

// ── Evaluation ────────────────────────────────────────────────

function matchClause(ticket: TicketSummary, clause: FilterClause): boolean {
  const { field, operator, value } = clause

  switch (field) {
    case 'status':
      return matchSetField(ticket.status, operator, value)
    case 'priority':
      return matchSetField(ticket.priority, operator, value)
    case 'type':
      return matchSetField(ticket.type, operator, value)
    case 'tag':
      return matchTagField(ticket.tags, operator, value)
    case 'assignee':
      return matchSetField(ticket.assignee ?? '', operator, value)
    case 'created':
      return matchDateField(ticket.created, operator, value)
    case 'modified':
      return matchDateField(ticket.modified, operator, value)
    case 'title':
      return matchTextField(ticket.title, operator, value)
    default:
      return true
  }
}

function matchSetField(
  fieldValue: string | number,
  operator: FilterOperator,
  value: FilterClause['value'],
): boolean {
  // Coerce to string for comparison — filter values from UI are always strings,
  // but field values like priority are numbers in TicketSummary
  const fv = String(fieldValue)
  switch (operator) {
    case 'is':
      return fv === String(value)
    case 'is_not':
      return fv !== String(value)
    case 'any_of':
      return Array.isArray(value) && value.map(String).includes(fv)
    case 'none_of':
      return Array.isArray(value) && !value.map(String).includes(fv)
    default:
      return true
  }
}

function matchTagField(
  tags: string[],
  operator: FilterOperator,
  value: FilterClause['value'],
): boolean {
  if (!Array.isArray(value)) return true
  // Defensive: tags could be a string or undefined from malformed ticket data
  const safeTags = Array.isArray(tags) ? tags : []
  const vals = value as string[]

  switch (operator) {
    case 'any_of':
      // Ticket has at least one of the specified tags
      return vals.some(v => safeTags.includes(v))
    case 'none_of':
      // Ticket has none of the specified tags
      return !vals.some(v => safeTags.includes(v))
    default:
      return true
  }
}

function matchTextField(
  fieldValue: string,
  operator: FilterOperator,
  value: FilterClause['value'],
): boolean {
  if (typeof value !== 'string') return true

  switch (operator) {
    case 'contains':
      return fieldValue.toLowerCase().includes(value.toLowerCase())
    default:
      return true
  }
}

function matchDateField(
  dateStr: string,
  operator: FilterOperator,
  value: FilterClause['value'],
): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr).getTime()

  switch (operator) {
    case 'before':
      return typeof value === 'string' && date < new Date(value).getTime()
    case 'after':
      return typeof value === 'string' && date > new Date(value).getTime()
    case 'between': {
      if (!Array.isArray(value) || value.length !== 2) return true
      const [start, end] = value as [string, string]
      return date >= new Date(start).getTime() && date <= new Date(end).getTime()
    }
    case 'last_n_days':
    case 'newer_than': {
      if (typeof value !== 'number') return true
      const cutoff = Date.now() - value * 86400000
      return date >= cutoff
    }
    case 'older_than': {
      if (typeof value !== 'number') return true
      const cutoff = Date.now() - value * 86400000
      return date < cutoff
    }
    default:
      return true
  }
}

// ── Main filter + sort entry point ────────────────────────────

export interface FilterSortParams {
  tickets: TicketSummary[]
  filters: FilterSet
  sortField: SortField
  sortDir: SortDir
  /** Quick text search across title + id (independent of filter clauses) */
  search?: string
}

export function applyFiltersAndSort(params: FilterSortParams): TicketSummary[] {
  const { tickets, filters, sortField, sortDir, search } = params
  let result = tickets

  // Quick search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    result = result.filter(
      t => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
    )
  }

  // Apply all filter clauses (AND)
  for (const clause of filters) {
    result = result.filter(t => matchClause(t, clause))
  }

  // Sort
  const dir = sortDir === 'asc' ? 1 : -1
  result = [...result].sort((a, b) => {
    if (sortField === 'priority') return (a.priority - b.priority) * dir
    if (sortField === 'created') return a.created.localeCompare(b.created) * dir
    if (sortField === 'modified') return a.modified.localeCompare(b.modified) * dir
    if (sortField === 'title') return a.title.localeCompare(b.title) * dir
    if (sortField === 'status') return a.status.localeCompare(b.status) * dir
    return 0
  })

  return result
}

// ── Serialization (URL query params) ──────────────────────────

export function serializeFilters(filters: FilterSet): string {
  if (filters.length === 0) return ''
  return encodeURIComponent(JSON.stringify(filters))
}

export function deserializeFilters(raw: string): FilterSet {
  if (!raw) return []
  try {
    return JSON.parse(decodeURIComponent(raw)) as FilterSet
  } catch {
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────

let _nextId = 0
export function createFilterId(): string {
  return `f-${++_nextId}-${Date.now().toString(36)}`
}

/**
 * Extract unique values for a field from tickets (for multi-select options).
 */
export function uniqueFieldValues(tickets: TicketSummary[], field: FilterField): string[] {
  const vals = new Set<string>()
  for (const t of tickets) {
    switch (field) {
      case 'status': vals.add(t.status); break
      case 'priority': vals.add(String(t.priority)); break
      case 'type': vals.add(t.type); break
      case 'tag': (Array.isArray(t.tags) ? t.tags : []).forEach(tag => { if (typeof tag === 'string') vals.add(tag) }); break
      case 'assignee': if (t.assignee) vals.add(t.assignee); break
    }
  }
  return [...vals].sort()
}
