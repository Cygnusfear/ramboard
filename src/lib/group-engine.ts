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

// ── Ancestry graph — shared by grouping + filtering ───────────

/**
 * Build a map: ticketId → Set of all ancestor ticket IDs (transitive).
 * Walks deps + links upward with BFS. Cycle-safe.
 */
export function buildAncestryMap(tickets: TicketSummary[]): Map<string, Set<string>> {
  const byId = new Set(tickets.map(t => t.id))

  // child → direct parents (only those in the visible set)
  const parentIds = new Map<string, string[]>()
  for (const t of tickets) {
    const parents = [...t.deps, ...t.links].filter(id => byId.has(id))
    if (parents.length > 0) parentIds.set(t.id, parents)
  }

  const cache = new Map<string, Set<string>>()

  function resolve(id: string): Set<string> {
    if (cache.has(id)) return cache.get(id)!

    const ancestors = new Set<string>()
    const visited = new Set<string>()
    const queue = parentIds.get(id) ?? []
    visited.add(id)

    for (const pid of queue) {
      if (visited.has(pid)) continue
      visited.add(pid)
      ancestors.add(pid)
      // Recurse through their parents too
      const grandparents = parentIds.get(pid) ?? []
      for (const gp of grandparents) {
        if (!visited.has(gp)) queue.push(gp)
      }
    }

    cache.set(id, ancestors)
    return ancestors
  }

  const result = new Map<string, Set<string>>()
  for (const t of tickets) {
    result.set(t.id, resolve(t.id))
  }
  return result
}

// ── Epic grouping — transitive graph walk ─────────────────────

function groupByEpic(tickets: TicketSummary[]): TicketGroup[] {
  // Index all tickets by ID
  const byId = new Map<string, TicketSummary>()
  for (const t of tickets) byId.set(t.id, t)

  const ancestryMap = buildAncestryMap(tickets)

  // Identify epic tickets in the visible set
  const epicTickets = tickets.filter(t => t.type === 'epic')
  const epicIds = new Set(epicTickets.map(t => t.id))

  // Assign each non-epic ticket to its nearest epic ancestor
  // "Nearest" = first epic found in ancestors (BFS order is shortest path)
  const buckets = new Map<string, TicketSummary[]>()
  const ungrouped: TicketSummary[] = []

  for (const t of tickets) {
    if (epicIds.has(t.id)) continue

    const ancestors = ancestryMap.get(t.id)
    // Find the first epic in ancestors
    let epicId: string | null = null
    if (ancestors) {
      for (const aid of ancestors) {
        if (epicIds.has(aid) || byId.get(aid)?.type === 'epic') {
          epicId = aid
          break
        }
      }
    }

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
