import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'
import { TagPill } from './tag-pill'
import { ArrowLeft, X } from '@phosphor-icons/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function TicketDetail() {
  const { activeTicket, clearActiveTicket, updateTicketStatus } = useTicketStore()
  const { activeProjectId } = useProjectStore()

  if (!activeTicket) return null

  const handleStatusToggle = () => {
    if (!activeProjectId) return
    const newStatus = activeTicket.status === 'closed' ? 'open' :
                      activeTicket.status === 'open' ? 'in_progress' :
                      activeTicket.status === 'in_progress' ? 'closed' : 'open'
    updateTicketStatus(activeProjectId, activeTicket.id, newStatus)
    clearActiveTicket()
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <button
          onClick={clearActiveTicket}
          className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <span className="font-mono text-sm text-zinc-500">{activeTicket.id}</span>

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
        {activeTicket.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {activeTicket.tags.map(tag => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}

        {/* Dependencies */}
        {activeTicket.deps.length > 0 && (
          <div className="mb-6 text-sm">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Depends on: </span>
            {activeTicket.deps.map(dep => (
              <span key={dep} className="mr-2 font-mono text-xs text-blue-400">{dep}</span>
            ))}
          </div>
        )}

        <div className="mb-6 h-px bg-zinc-800" />

        {/* Markdown body */}
        <article className="prose prose-invert prose-sm max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-h2:text-base prose-h3:text-sm prose-p:text-zinc-300 prose-p:leading-relaxed prose-a:text-blue-400 prose-code:rounded prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-li:text-zinc-300 prose-strong:text-zinc-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {activeTicket.body}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
