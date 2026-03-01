import React from 'react'
import { TicketLink } from '@/components/ticket-link'

/**
 * Broad regex for anything that looks like a ticket ID:
 * alphanumeric prefix (1-5 chars), dash, alphanumeric suffix (3-5 chars).
 * We cast a wide net, then verify against known IDs.
 */
export const TICKET_ID_RE = /\b([a-z0-9]{1,5}-[a-z0-9]{3,5})\b/gi

/**
 * Takes text and a set of known ticket IDs. Returns React elements
 * with verified ticket IDs replaced by clickable TicketLink components.
 */
export function linkifyTicketIds(
  text: string,
  knownIds: Set<string>,
): React.ReactNode {
  if (knownIds.size === 0) return text

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  // Reset regex state
  TICKET_ID_RE.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = TICKET_ID_RE.exec(text)) !== null) {
    const candidate = match[1]
    const start = match.index

    // Only link if this ID actually exists in the database
    if (!knownIds.has(candidate)) continue

    // Text before this match
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    parts.push(
      <TicketLink key={`${candidate}-${start}`} id={candidate} className="text-[inherit]" />,
    )
    lastIndex = start + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  // No matches — return original string
  if (parts.length === 0) return text
  if (parts.length === 1 && typeof parts[0] === 'string') return text

  return <>{parts}</>
}
