import { useMemo } from 'react'
import { useTicketStore } from '@/stores/ticket-store'
import { TicketLink } from './ticket-link'
import { GitBranch, Link, ArrowRight, Plus } from '@phosphor-icons/react'
import type { Ticket, TicketSummary } from '@/lib/types'

interface ActivityEntry {
  date: string
  icon: React.ReactNode
  content: React.ReactNode
}

function formatActivityDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildActivityEntries(
  ticket: Ticket,
  allTickets: TicketSummary[],
): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  // 1. Ticket created
  if (ticket.created) {
    entries.push({
      date: ticket.created,
      icon: <Plus size={14} weight="bold" />,
      content: <span className="text-zinc-400">Ticket created</span>,
    })
  }

  // 2. Forward deps — this ticket depends on ...
  for (const depId of ticket.deps ?? []) {
    entries.push({
      date: ticket.created,
      icon: <GitBranch size={14} />,
      content: (
        <span className="text-zinc-400">
          Depends on <TicketLink id={depId} className="text-xs" />
        </span>
      ),
    })
  }

  // 3. Forward links — this ticket linked to ...
  for (const linkId of ticket.links ?? []) {
    entries.push({
      date: ticket.created,
      icon: <Link size={14} />,
      content: (
        <span className="text-zinc-400">
          Linked to <TicketLink id={linkId} className="text-xs" />
        </span>
      ),
    })
  }

  // 4. Reverse deps — other tickets that depend on this one
  for (const other of allTickets) {
    if (other.id === ticket.id) continue
    const otherDeps = Array.isArray(other.deps) ? other.deps : []
    if (otherDeps.includes(ticket.id)) {
      entries.push({
        date: other.created,
        icon: <GitBranch size={14} />,
        content: (
          <span className="text-zinc-400">
            <TicketLink id={other.id} className="text-xs" /> depends on this ticket
          </span>
        ),
      })
    }
  }

  // 5. Reverse links — other tickets that link to this one
  for (const other of allTickets) {
    if (other.id === ticket.id) continue
    const otherLinks = Array.isArray(other.links) ? other.links : []
    if (otherLinks.includes(ticket.id)) {
      entries.push({
        date: other.created,
        icon: <Link size={14} />,
        content: (
          <span className="text-zinc-400">
            <TicketLink id={other.id} className="text-xs" /> linked to this ticket
          </span>
        ),
      })
    }
  }

  // Sort oldest → newest
  entries.sort((a, b) => {
    if (!a.date || !b.date) return 0
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return entries
}

export function TicketActivity() {
  const { activeTicket, tickets } = useTicketStore()

  const entries = useMemo(() => {
    if (!activeTicket) return []
    return buildActivityEntries(activeTicket, tickets)
  }, [activeTicket, tickets])

  if (entries.length === 0) return null

  return (
    <div className="mt-8 border-t border-zinc-800 pt-6">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Activity
      </h3>
      <div className="relative ml-2">
        {/* Vertical line */}
        <div className="absolute top-1 bottom-1 left-[6px] w-px bg-zinc-800" />

        <div className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-start gap-3">
              {/* Dot */}
              <div className="relative z-10 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-zinc-500">
                {entry.icon}
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 items-baseline gap-2 text-xs leading-relaxed">
                <span className="shrink-0 text-zinc-600">
                  {formatActivityDate(entry.date)}
                </span>
                {entry.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
