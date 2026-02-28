import { useMemo } from 'react'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { useLocation } from 'wouter'
import { getLastFilterSearch } from '@/hooks/use-filter-url-sync'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'
import { TagPill } from './tag-pill'
import { ArrowLeft } from '@phosphor-icons/react'
import { CopyableId } from './copyable-id'
import { TicketLink } from './ticket-link'
import { TicketActivity } from './ticket-activity'
import { useLinkifiedMarkdown } from '@/hooks/use-linkified-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function TicketDetail() {
  const { activeTicket, tickets, updateTicketStatus } = useTicketStore()
  const { activeProjectId } = useProjectStore()
  const [, navigate] = useLocation()
  const markdownComponents = useLinkifiedMarkdown()

  // Compute reverse relationships: other tickets that dep on or link to this one
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

  if (!activeTicket) return null

  const goBack = () => {
    if (!activeProjectId) return
    const search = getLastFilterSearch()
    navigate(`/${activeProjectId}${search ? `?${search}` : ''}`)
  }

  const handleStatusToggle = () => {
    if (!activeProjectId) return
    const newStatus = activeTicket.status === 'closed' ? 'open' :
                      activeTicket.status === 'open' ? 'in_progress' :
                      activeTicket.status === 'in_progress' ? 'closed' : 'open'
    updateTicketStatus(activeProjectId, activeTicket.id, newStatus)
    goBack()
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
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

        {/* Metadata */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
          <StatusDot status={activeTicket.status} showLabel />
          <PriorityIcon priority={activeTicket.priority} showLabel />
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {activeTicket.type}
          </span>
          {activeTicket.created && (
            <span className="text-xs text-zinc-500">{activeTicket.created}</span>
          )}
        </div>

        {/* Tags */}
        {activeTicket.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {activeTicket.tags.map(tag => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}

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

        {/* Reverse deps — other tickets that depend on this one */}
        {reverseDeps.length > 0 && (
          <div className="mb-6 text-sm">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Depended on by: </span>
            {reverseDeps.map(id => (
              <TicketLink key={id} id={id} className="mr-2 text-xs" />
            ))}
          </div>
        )}

        {/* Reverse links — other tickets that link to this one */}
        {reverseLinks.length > 0 && (
          <div className="mb-6 text-sm">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Referenced by: </span>
            {reverseLinks.map(id => (
              <TicketLink key={id} id={id} className="mr-2 text-xs" />
            ))}
          </div>
        )}

        <div className="mb-6 h-px bg-zinc-800" />

        {/* Markdown body */}
        <article className="prose prose-invert prose-sm max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-h2:text-base prose-h3:text-sm prose-p:text-zinc-300 prose-p:leading-relaxed prose-a:text-blue-400 prose-code:rounded prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-li:text-zinc-300 prose-strong:text-zinc-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {activeTicket.body}
          </ReactMarkdown>
        </article>

        {/* Activity timeline */}
        <TicketActivity />
      </div>
    </div>
  )
}
