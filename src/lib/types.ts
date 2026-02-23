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
  counts: { open: number; in_progress: number; closed: number; cancelled: number }
  total: number
}

export type ViewMode = 'list' | 'board'
export type SortField = 'priority' | 'created' | 'modified' | 'title' | 'status'
export type SortDir = 'asc' | 'desc'

export const STATUS_ORDER = ['open', 'in_progress', 'closed', 'cancelled'] as const
export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
  cancelled: 'Cancelled',
}
export const PRIORITY_LABELS: Record<number, string> = {
  0: 'Urgent',
  1: 'High',
  2: 'Medium',
  3: 'Low',
}

// ── Saved Views ───────────────────────────────────────────────

export interface SavedList {
  name: string
  filters: import('./filter-engine').FilterClause[]
  sortField: SortField
  sortDir: SortDir
}

export interface SavedView {
  id: string
  name: string
  mode: 'list' | 'board'
  /** List mode — single filtered list */
  list?: SavedList
  /** Board mode — columns rendered left-to-right, leftmost match wins */
  columns?: SavedList[]
  /** Board-level sort override (applies to all columns when set) */
  boardSort?: { field: SortField; dir: SortDir }
}
