import { useMemo, useCallback } from 'react'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { useNavigate } from '@/hooks/use-navigate'
import { getLastFilterSearch } from '@/hooks/use-filter-url-sync'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'
import { InlineSelect } from './inline-select'
import { TagEditor } from './tag-editor'
import { TicketBodyEditor } from './ticket-body-editor'
import { TicketLink } from './ticket-link'
import { TicketActivity } from './ticket-activity'
import { CopyableId } from './copyable-id'
import { ArrowLeft } from '@phosphor-icons/react'
import { statusOptions, priorityOptions, typeOptions } from '@/lib/ticket-options'
import { TicketContextMenu } from './ticket-context-menu'
import { nextStatus } from '@/lib/types'

export function TicketDetail() {
  const {
    activeTicket, tickets,
    updateTicketStatus, updateTicketPriority, updateTicketType,
    updateTicketTags, updateTicketBody,
  } = useTicketStore()
  const { activeProjectId } = useProjectStore()
  const [, navigate] = useNavigate()

  // Reverse relationships: other tickets that dep on or link to this one
  const { reverseDeps, reverseLinks } = useMemo(() => {
    if (!activeTicket) return { reverseDeps: [] as string[], reverseLinks: [] as string[] }
    const rd: string[] = []
    const rl: string[] = []
    for (const t of tickets) {
      if (t.id === activeTicket.id) continue
      const tDeps = Array.isArray(t.deps) ? t.deps : []
      const tLinks = Array.isArray(t.links) ? t.links : []
      if (tDeps.includes(activeTicket.id)) rd.push(t.id)
      if (tLinks.includes(activeTicket.id)) rl.push(t.id)
    }
    return { reverseDeps: rd, reverseLinks: rl }
  }, [activeTicket, tickets])

  const goBack = useCallback(() => {
    if (!activeProjectId) return
    const search = getLastFilterSearch()
    navigate(`/${activeProjectId}${search ? `?${search}` : ''}`)
  }, [activeProjectId, navigate])

  const handleStatusToggle = useCallback(() => {
    if (!activeProjectId || !activeTicket) return
    const newStatus = nextStatus(activeTicket.status)
    updateTicketStatus(activeProjectId, activeTicket.id, newStatus)
    goBack()
  }, [activeProjectId, activeTicket, updateTicketStatus, goBack])

  if (!activeTicket) return null

  const pid = activeProjectId!

  return (
    <TicketContextMenu
      targetTickets={[activeTicket]}
      triggerClassName="flex flex-1 flex-col overflow-auto"
      hideOpen
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <CopyableId id={activeTicket.id} className="text-sm" />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleStatusToggle}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            {activeTicket.status === 'closed' ? 'Reopen' :
             activeTicket.status === 'open' ? 'Start' : 'Close'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-3xl px-6 py-8">
        <CopyableId id={activeTicket.id} className="mb-2 text-xs" />
        <h1 className="mb-4 text-xl font-medium tracking-tight text-zinc-100">
          {activeTicket.title}
        </h1>

        {/* Metadata — click to change */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <InlineSelect
            options={statusOptions}
            value={activeTicket.status}
            onChange={(val) => updateTicketStatus(pid, activeTicket.id, val)}
          >
            <span className="flex items-center gap-1.5 rounded-md px-2 py-1">
              <StatusDot status={activeTicket.status} showLabel />
            </span>
          </InlineSelect>

          <InlineSelect
            options={priorityOptions}
            value={activeTicket.priority}
            onChange={(val) => updateTicketPriority(pid, activeTicket.id, val)}
          >
            <span className="flex items-center gap-1.5 rounded-md px-2 py-1">
              <PriorityIcon priority={activeTicket.priority} showLabel />
            </span>
          </InlineSelect>

          <InlineSelect
            options={typeOptions}
            value={activeTicket.type}
            onChange={(val) => updateTicketType(pid, activeTicket.id, val)}
          >
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {activeTicket.type}
            </span>
          </InlineSelect>

          {activeTicket.created && (
            <span className="text-xs text-zinc-500">{activeTicket.created}</span>
          )}
        </div>

        {/* Tags — editable */}
        <div className="mb-4">
          <TagEditor
            tags={activeTicket.tags ?? []}
            onRemove={(tag) => {
              const next = (activeTicket.tags ?? []).filter(t => t !== tag)
              updateTicketTags(pid, activeTicket.id, next)
            }}
            onAdd={(tag) => {
              const next = [...(activeTicket.tags ?? []), tag]
              updateTicketTags(pid, activeTicket.id, next)
            }}
          />
        </div>

        {/* Dependencies */}
        {activeTicket.deps?.length > 0 && (
          <div className="mb-6 text-sm">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Depends on: </span>
            {activeTicket.deps.map(dep => (
              <TicketLink key={dep} id={dep} className="mr-2 text-xs" />
            ))}
          </div>
        )}

        {/* Links */}
        {activeTicket.links?.length > 0 && (
          <div className="mb-6 text-sm">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Linked: </span>
            {activeTicket.links.map(linkId => (
              <TicketLink key={linkId} id={linkId} className="mr-2 text-xs" />
            ))}
          </div>
        )}

        {/* Reverse deps */}
        {reverseDeps.length > 0 && (
          <div className="mb-6 text-sm">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Depended on by: </span>
            {reverseDeps.map(id => (
              <TicketLink key={id} id={id} className="mr-2 text-xs" />
            ))}
          </div>
        )}

        {/* Reverse links */}
        {reverseLinks.length > 0 && (
          <div className="mb-6 text-sm">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Referenced by: </span>
            {reverseLinks.map(id => (
              <TicketLink key={id} id={id} className="mr-2 text-xs" />
            ))}
          </div>
        )}

        <div className="mb-6 h-px bg-zinc-800" />

        {/* Editable body */}
        <TicketBodyEditor
          body={activeTicket.body}
          onSave={(md) => updateTicketBody(pid, activeTicket.id, md)}
        />

        {/* Activity timeline */}
        <div className="mt-8">
          <TicketActivity />
        </div>
      </div>
    </TicketContextMenu>
  )
}
