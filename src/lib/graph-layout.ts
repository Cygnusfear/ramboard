import dagre from '@dagrejs/dagre'
import type { TicketSummary } from '@/lib/types'

// ── Layout types ──────────────────────────────────────────────

export interface LayoutNode {
  ticket: TicketSummary
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutEdge {
  from: string
  to: string
  type: 'dep' | 'link'
  points: { x: number; y: number }[]
}

export interface GraphLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

export const NODE_WIDTH = 340
export const NODE_HEIGHT = 56
export const PADDING = 60

// ── Pure layout computation ───────────────────────────────────

export function computeLayout(tickets: TicketSummary[]): GraphLayout {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'LR',
    nodesep: 24,
    ranksep: 80,
    marginx: PADDING,
    marginy: PADDING,
  })
  g.setDefaultEdgeLabel(() => ({}))

  const idSet = new Set(tickets.map(t => t.id))

  // Add nodes
  for (const t of tickets) {
    g.setNode(t.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  // Add edges (only for tickets in the filtered set)
  const edges: { from: string; to: string; type: 'dep' | 'link' }[] = []
  for (const t of tickets) {
    for (const dep of t.deps ?? []) {
      if (idSet.has(dep)) {
        g.setEdge(t.id, dep)
        edges.push({ from: t.id, to: dep, type: 'dep' })
      }
    }
    for (const link of t.links ?? []) {
      if (idSet.has(link)) {
        // Avoid duplicate edges (link is bidirectional in concept)
        if (!edges.some(e => (e.from === link && e.to === t.id) || (e.from === t.id && e.to === link))) {
          g.setEdge(t.id, link)
          edges.push({ from: t.id, to: link, type: 'link' })
        }
      }
    }
  }

  dagre.layout(g)

  const graphLabel = g.graph()
  const nodes: LayoutNode[] = tickets.map(t => {
    const n = g.node(t.id)
    return { ticket: t, x: n.x, y: n.y, width: n.width, height: n.height }
  })

  const layoutEdges: LayoutEdge[] = edges.map(e => {
    const dagreEdge = g.edge(e.from, e.to)
    return {
      from: e.from,
      to: e.to,
      type: e.type,
      points: dagreEdge?.points ?? [],
    }
  })

  return {
    nodes,
    edges: layoutEdges,
    width: (graphLabel?.width ?? 800) + PADDING * 2,
    height: (graphLabel?.height ?? 600) + PADDING * 2,
  }
}
