export interface TicketSummary {
  id: string
  status: 'open' | 'in_progress' | 'closed' | 'cancelled'
  type: string
  priority: number
  tags: string[]
  deps: string[]
  links: string[]
  created: string
  modified: string
  assignee?: string
  title: string
  project: string
}

export interface Ticket extends TicketSummary {
  body: string
}

export interface ProjectSummary {
  id: string
  name: string
}

export type ViewMode = 'list' | 'board' | 'graph'
export type SortField = 'priority' | 'created' | 'modified' | 'title' | 'status'
export type SortDir = 'asc' | 'desc'

export const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created' },
  { value: 'modified', label: 'Modified' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Title' },
]

export const STATUS_ORDER = ['open', 'in_progress', 'closed', 'cancelled'] as const
export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

/** Maps each status to the next status when cycling (space/click). */
export const STATUS_CYCLE: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'closed',
  closed: 'open',
}

/** Returns the next status in the cycle, defaulting to 'open'. */
export function nextStatus(status: string): string {
  return STATUS_CYCLE[status] ?? 'open'
}
export const PRIORITY_LABELS: Record<number, string> = {
  0: 'Urgent',
  1: 'High',
  2: 'Medium',
  3: 'Low',
}

// ── Saved Views ───────────────────────────────────────────────

export interface SavedList {
  /** Stable identity for drag-and-drop reordering */
  id: string
  name: string
  filters: import('./filter-engine').FilterClause[]
  sortField: SortField
  sortDir: SortDir
}

export interface SavedView {
  id: string
  name: string
  mode: ViewMode
  /** List mode — single filtered list */
  list?: SavedList
  /** Board mode — columns rendered left-to-right, leftmost match wins */
  columns?: SavedList[]
  /** Board-level sort override (applies to all columns when set) */
  boardSort?: { field: SortField; dir: SortDir }
}
