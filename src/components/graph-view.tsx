import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import dagre from '@dagrejs/dagre'
import { useFilteredTickets } from '@/hooks/use-filtered-tickets'
import { useProjectStore } from '@/stores/project-store'
import { useNavigate } from '@/hooks/use-navigate'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'
import { STATUS_LABELS, type TicketSummary } from '@/lib/types'

// ── Layout ────────────────────────────────────────────────────

interface LayoutNode {
  ticket: TicketSummary
  x: number
  y: number
  width: number
  height: number
}

interface LayoutEdge {
  from: string
  to: string
  type: 'dep' | 'link'
  points: { x: number; y: number }[]
}

interface GraphLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

const NODE_WIDTH = 340
const NODE_HEIGHT = 56
const PADDING = 60

function computeLayout(tickets: TicketSummary[]): GraphLayout {
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

// ── Edge path ─────────────────────────────────────────────────

function edgePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  const [start, ...rest] = points
  let d = `M ${start.x} ${start.y}`
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`
  }
  return d
}

// ── Tooltip ───────────────────────────────────────────────────

function Tooltip({ ticket, x, y }: { ticket: TicketSummary; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-50 w-[320px] rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl shadow-zinc-950/80"
      style={{ left: x + 12, top: y - 8 }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-mono text-[10px] text-zinc-500">{ticket.id}</span>
        <StatusDot status={ticket.status} showLabel />
        <PriorityIcon priority={ticket.priority} showLabel />
      </div>
      <div className="mb-1.5 text-sm leading-snug text-zinc-200">{ticket.title}</div>
      {ticket.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ticket.tags.map(tag => (
            <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{tag}</span>
          ))}
        </div>
      )}
      {(ticket.deps?.length > 0 || ticket.links?.length > 0) && (
        <div className="mt-1.5 text-[10px] text-zinc-500">
          {ticket.deps?.length > 0 && <div>Deps: {ticket.deps.join(', ')}</div>}
          {ticket.links?.length > 0 && <div>Links: {ticket.links.join(', ')}</div>}
        </div>
      )}
    </div>
  )
}

// ── Node colors by status ─────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: '#a1a1aa',       // zinc-400
  in_progress: '#60a5fa', // blue-400
  closed: '#4ade80',      // green-400
  cancelled: '#71717a',   // zinc-500
}

// ── Graph View ────────────────────────────────────────────────

export function GraphView() {
  const tickets = useFilteredTickets()
  const { activeProjectId } = useProjectStore()
  const [, navigate] = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<{ ticket: TicketSummary; mx: number; my: number } | null>(null)

  // Pan & zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  const layout = useMemo(() => computeLayout(tickets), [tickets])

  // Fit graph in viewport on first render / ticket change
  useEffect(() => {
    const el = containerRef.current
    if (!el || layout.nodes.length === 0) return
    const vw = el.clientWidth
    const vh = el.clientHeight
    const sx = vw / layout.width
    const sy = vh / layout.height
    const s = Math.min(sx, sy, 1.2) * 0.9 // cap at 1.2x, leave margin
    setTransform({
      x: (vw - layout.width * s) / 2,
      y: (vh - layout.height * s) / 2,
      scale: s,
    })
  }, [layout])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    setTransform(t => {
      const newScale = Math.min(Math.max(t.scale + delta * t.scale, 0.15), 3)
      const rect = containerRef.current!.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      // Zoom toward cursor
      const ratio = newScale / t.scale
      return {
        x: mx - ratio * (mx - t.x),
        y: my - ratio * (my - t.y),
        scale: newScale,
      }
    })
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    // Only start pan if clicking on the background (SVG), not a node
    if ((e.target as HTMLElement).closest('[data-graph-node]')) return
    isPanning.current = true
    panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [transform])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return
    setTransform(t => ({
      ...t,
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    }))
  }, [])

  const handlePointerUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const handleNodeClick = useCallback((ticketId: string) => {
    if (activeProjectId) {
      navigate(`/${activeProjectId}/ticket/${ticketId}`)
    }
  }, [activeProjectId, navigate])

  if (tickets.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-zinc-500">No tickets match current filters</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 select-none overflow-hidden bg-zinc-950"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: isPanning.current ? 'grabbing' : 'grab' }}
    >
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          {layout.edges.map((edge, i) => (
            <g key={`${edge.from}-${edge.to}-${i}`}>
              <path
                d={edgePath(edge.points)}
                fill="none"
                stroke={edge.type === 'dep' ? '#3f3f46' : '#27272a'}
                strokeWidth={1.5}
                strokeDasharray={edge.type === 'link' ? '6 4' : undefined}
              />
              {/* Arrowhead */}
              {edge.points.length >= 2 && (() => {
                const last = edge.points[edge.points.length - 1]
                const prev = edge.points[edge.points.length - 2]
                const angle = Math.atan2(last.y - prev.y, last.x - prev.x) * (180 / Math.PI)
                return (
                  <polygon
                    points="0,-4 10,0 0,4"
                    fill={edge.type === 'dep' ? '#52525b' : '#3f3f46'}
                    transform={`translate(${last.x},${last.y}) rotate(${angle})`}
                  />
                )
              })()}
            </g>
          ))}

          {/* Nodes */}
          {layout.nodes.map(({ ticket, x, y, width, height }) => {
            const isEpic = ticket.type === 'epic' || ticket.tags?.includes('epic')
            const isBoardReview = ticket.tags?.includes('board-review')
            const borderColor = isEpic ? '#f97316' : (STATUS_COLORS[ticket.status] ?? '#71717a')
            const nodeFill = isBoardReview ? '#302a0a' : '#18181b'
            const nx = x - width / 2
            const ny = y - height / 2
            return (
              <g
                key={ticket.id}
                data-graph-node
                onClick={() => handleNodeClick(ticket.id)}
                onPointerEnter={(e) => setHovered({ ticket, mx: e.clientX, my: e.clientY })}
                onPointerLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={nx}
                  y={ny}
                  width={width}
                  height={height}
                  rx={6}
                  ry={6}
                  fill={nodeFill}
                  stroke={borderColor}
                  strokeWidth={isEpic ? 2 : 1.5}
                />
                <foreignObject x={nx} y={ny} width={width} height={height}>
                  <div
                    style={{
                      width, height,
                      padding: '6px 10px',
                      overflow: 'hidden',
                      display: 'flex',
                      gap: 6,
                      alignItems: 'flex-start',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, paddingTop: 1 }}>
                      <StatusDot status={ticket.status} />
                      <PriorityIcon priority={ticket.priority} />
                    </span>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: 11,
                        color: '#a1a1aa',
                        flexShrink: 0,
                        lineHeight: '18px',
                      }}
                    >
                      {ticket.id}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Geist', sans-serif",
                        fontSize: 12,
                        color: '#d4d4d8',
                        lineHeight: '18px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {ticket.title}
                    </span>
                  </div>
                </foreignObject>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hovered && <Tooltip ticket={hovered.ticket} x={hovered.mx} y={hovered.my} />}

      {/* Legend */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-2.5 text-[10px] text-zinc-500 backdrop-blur-sm">
        {/* Status colors */}
        <div className="flex items-center gap-3">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm border-2 border-orange-500" />
            Epic
          </span>
        </div>
        {/* Edge types */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#3f3f46" strokeWidth="1.5" /></svg>
            depends on
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#27272a" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
            linked
          </span>
        </div>
      </div>
    </div>
  )
}
