import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { useUIStore } from '@/stores/ui-store'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'
import { TagList } from './tag-pill'
import { STATUS_ORDER, STATUS_LABELS } from '@/lib/types'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { useState } from 'react'
import type { TicketSummary } from '@/lib/types'

function BoardCard({ ticket, isDragging }: { ticket: TicketSummary; isDragging?: boolean }) {
  const { fetchTicketDetail } = useTicketStore()
  const { activeProjectId } = useProjectStore()

  const handleClick = () => {
    if (activeProjectId) fetchTicketDetail(activeProjectId, ticket.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-all duration-100 hover:border-zinc-700 hover:bg-zinc-800/80 ${
        isDragging ? 'shadow-xl shadow-zinc-950/50 ring-1 ring-blue-500/30' : ''
      }`}
    >
      <div className="mb-1 font-mono text-[10px] text-zinc-500">{ticket.id}</div>
      <div className="mb-2 line-clamp-2 text-sm leading-snug text-zinc-200">{ticket.title}</div>
      <div className="flex items-center justify-between">
        <PriorityIcon priority={ticket.priority} />
        {ticket.tags.length > 0 && <TagList tags={ticket.tags} max={2} />}
      </div>
    </div>
  )
}

function SortableCard({ ticket }: { ticket: TicketSummary }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
    data: { ticket },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardCard ticket={ticket} />
    </div>
  )
}

function BoardColumn({ status, tickets }: { status: string; tickets: TicketSummary[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const { setNodeRef } = useDroppable({ id: status })

  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        className="flex w-10 cursor-pointer flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 py-3"
      >
        <span className="text-xs font-medium text-zinc-500 [writing-mode:vertical-lr]">
          {STATUS_LABELS[status]}
        </span>
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
          {tickets.length}
        </span>
      </div>
    )
  }

  return (
    <div className="flex w-72 shrink-0 flex-col" ref={setNodeRef}>
      <div
        onClick={() => setCollapsed(true)}
        className="mb-2 flex cursor-pointer items-center gap-2 px-1"
      >
        <StatusDot status={status} />
        <span className="text-xs font-medium text-zinc-300">{STATUS_LABELS[status]}</span>
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
          {tickets.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-auto rounded-lg bg-zinc-900/30 p-2">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map(ticket => (
            <SortableCard key={ticket.id} ticket={ticket} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export function BoardView() {
  const tickets = useTicketStore(s => s.filteredTickets())
  const { updateTicketStatus } = useTicketStore()
  const { activeProjectId } = useProjectStore()
  const [activeCard, setActiveCard] = useState<TicketSummary | null>(null)

  const columns = STATUS_ORDER.map(status => ({
    status,
    tickets: tickets.filter(t => t.status === status),
  }))

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find(t => t.id === event.active.id)
    if (ticket) setActiveCard(ticket)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = event
    if (!over || !activeProjectId) return

    // Determine target status — over.id could be a ticket ID or a column status
    let targetStatus = over.id as string
    if (!STATUS_ORDER.includes(targetStatus as any)) {
      // over.id is a ticket — find its status
      const overTicket = tickets.find(t => t.id === over.id)
      if (overTicket) targetStatus = overTicket.status
      else return
    }

    const ticket = tickets.find(t => t.id === active.id)
    if (ticket && ticket.status !== targetStatus) {
      updateTicketStatus(activeProjectId, ticket.id, targetStatus)
    }
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {columns.map(col => (
          <BoardColumn key={col.status} status={col.status} tickets={col.tickets} />
        ))}
      </div>

      <DragOverlay>
        {activeCard && <BoardCard ticket={activeCard} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}
