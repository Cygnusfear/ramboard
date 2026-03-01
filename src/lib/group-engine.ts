/**
 * group-engine.ts — Pure grouping logic for list view.
 *
 * Three modes: status, type, epic.
 * Status/type are flat field-value grouping.
 * Epic is transitive graph-walk: BFS up deps/links to nearest epic ancestor.
 */

import type { TicketSummary } from './types'

// ── Types ─────────────────────────────────────────────────────

export type GroupField = 'status' | 'type' | 'epic'

export interface TicketGroup {
  /** Group identity: field value or epic ticket ID */
  key: string
  /** Display name: "Open", "Bug", or epic title */
  label: string
  /** For epic grouping only — the epic ticket itself (clickable header) */
  epic?: TicketSummary
  /** Child tickets in this group (pre-sorted) */
  tickets: TicketSummary[]
}

export type FlatRow =
  | { type: 'group-header'; group: TicketGroup }
  | { type: 'ticket'; ticket: TicketSummary; groupKey: string }

// ── Canonical group ordering ──────────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  open: 0,
  in_progress: 1,
  closed: 2,
  cancelled: 3,
}

const TYPE_ORDER: Record<string, number> = {
  epic: 0,
  feature: 1,
  task: 2,
  bug: 3,
  chore: 4,
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  closed: 'Closed',
  cancelled: 'Cancelled',
}

const TYPE_LABELS: Record<string, string> = {
  epic: 'Epic',
  feature: 'Feature',
  task: 'Task',
  bug: 'Bug',
  chore: 'Chore',
}

// ── Grouping ──────────────────────────────────────────────────

/**
 * Group an already-sorted ticket list by a field.
 * Sort order within groups is preserved from input.
 */
export function groupTickets(
  tickets: TicketSummary[],
  groupBy: GroupField,
): TicketGroup[] {
  if (groupBy === 'epic') return groupByEpic(tickets)
  return groupByField(tickets, groupBy)
}

function groupByField(
  tickets: TicketSummary[],
  field: 'status' | 'type',
): TicketGroup[] {
  const orderMap = field === 'status' ? STATUS_ORDER : TYPE_ORDER
  const labelMap = field === 'status' ? STATUS_LABELS : TYPE_LABELS

  const buckets = new Map<string, TicketSummary[]>()

  for (const t of tickets) {
    const key = field === 'status' ? t.status : t.type
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = []
      buckets.set(key, bucket)
    }
    bucket.push(t)
  }

  // Sort groups by canonical order, unknowns at end
  const entries = [...buckets.entries()]
  entries.sort(([a], [b]) => (orderMap[a] ?? 99) - (orderMap[b] ?? 99))

  return entries.map(([key, tix]) => ({
    key,
    label: labelMap[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
    tickets: tix,
  }))
}

// ── Epic grouping — transitive graph walk ─────────────────────

function groupByEpic(tickets: TicketSummary[]): TicketGroup[] {
  // Index all tickets by ID
  const byId = new Map<string, TicketSummary>()
  for (const t of tickets) byId.set(t.id, t)

  // Build child→parent adjacency from deps + links
  // A ticket's deps/links point to its parents
  const parentIds = new Map<string, string[]>()
  for (const t of tickets) {
    const parents = [...t.deps, ...t.links].filter(id => byId.has(id))
    if (parents.length > 0) parentIds.set(t.id, parents)
  }

  // Cache: ticketId → nearest epic ancestor ID (or null)
  const epicCache = new Map<string, string | null>()

  function findEpicAncestor(id: string): string | null {
    if (epicCache.has(id)) return epicCache.get(id)!

    // BFS up the graph
    const visited = new Set<string>()
    const queue: { id: string; depth: number }[] = [{ id, depth: 0 }]
    visited.add(id)

    let nearest: string | null = null
    let nearestDepth = Infinity

    while (queue.length > 0) {
      const cur = queue.shift()!
      const parents = parentIds.get(cur.id)
      if (!parents) continue

      for (const pid of parents) {
        if (visited.has(pid)) continue
        visited.add(pid)

        const parent = byId.get(pid)
        if (!parent) continue

        if (parent.type === 'epic' && cur.depth + 1 < nearestDepth) {
          nearest = pid
          nearestDepth = cur.depth + 1
        } else {
          queue.push({ id: pid, depth: cur.depth + 1 })
        }
      }
    }

    epicCache.set(id, nearest)
    return nearest
  }

  // Identify epic tickets in the visible set
  const epicTickets = tickets.filter(t => t.type === 'epic')
  const epicIds = new Set(epicTickets.map(t => t.id))

  // Assign each non-epic ticket to its nearest epic ancestor
  const buckets = new Map<string, TicketSummary[]>()
  const ungrouped: TicketSummary[] = []

  for (const t of tickets) {
    // Epic tickets are group headers, not children
    if (epicIds.has(t.id)) continue

    const epicId = findEpicAncestor(t.id)
    if (epicId) {
      let bucket = buckets.get(epicId)
      if (!bucket) {
        bucket = []
        buckets.set(epicId, bucket)
      }
      bucket.push(t)
    } else {
      ungrouped.push(t)
    }
  }

  // Build groups — epics in same order as input list
  const groups: TicketGroup[] = []

  for (const epic of epicTickets) {
    const children = buckets.get(epic.id) ?? []
    // Include the epic group even if it has no visible children
    groups.push({
      key: epic.id,
      label: epic.title,
      epic,
      tickets: children,
    })
  }

  // Also create groups for epic ancestors that exist but aren't in the filtered set
  for (const [epicId, children] of buckets) {
    if (epicIds.has(epicId)) continue // Already handled above
    const epicTicket = byId.get(epicId)
    groups.push({
      key: epicId,
      label: epicTicket?.title ?? epicId,
      epic: epicTicket,
      tickets: children,
    })
  }

  if (ungrouped.length > 0) {
    groups.push({
      key: '__ungrouped__',
      label: 'Ungrouped',
      tickets: ungrouped,
    })
  }

  return groups
}

// ── Flatten to virtual list ───────────────────────────────────

/**
 * Flatten groups into a flat row array for the virtualizer.
 * Collapsed groups emit only their header row.
 */
export function flattenGroups(
  groups: TicketGroup[],
  collapsedGroups: Set<string>,
): FlatRow[] {
  const rows: FlatRow[] = []

  for (const group of groups) {
    rows.push({ type: 'group-header', group })

    if (!collapsedGroups.has(group.key)) {
      for (const ticket of group.tickets) {
        rows.push({ type: 'ticket', ticket, groupKey: group.key })
      }
    }
  }

  return rows
}
