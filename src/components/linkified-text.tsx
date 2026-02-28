import { linkifyTicketIds } from '@/lib/linkify-ticket-ids'
import { useKnownTicketIds } from '@/hooks/use-known-ticket-ids'

interface LinkifiedTextProps {
  children: string
  className?: string
}

/**
 * Renders plain text with ticket IDs auto-linked to their detail views.
 * Only links IDs that actually exist in the current project's ticket store.
 *
 * Use for titles, descriptions, and any non-markdown text that may
 * reference ticket IDs inline.
 */
export function LinkifiedText({ children, className }: LinkifiedTextProps) {
  const knownIds = useKnownTicketIds()
  const content = linkifyTicketIds(children, knownIds)

  if (className) {
    return <span className={className}>{content}</span>
  }

  // If linkify returned the original string (no links found), return as-is
  if (typeof content === 'string') return <>{content}</>

  return <>{content}</>
}
