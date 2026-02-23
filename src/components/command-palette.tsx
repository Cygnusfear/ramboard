import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { StatusDot } from './status-dot'
import { PriorityIcon } from './priority-icon'

export function CommandPalette() {
  const { showCommandPalette, setShowCommandPalette } = useUIStore()
  const { tickets, fetchTicketDetail } = useTicketStore()
  const { activeProjectId } = useProjectStore()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showCommandPalette) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showCommandPalette])

  if (!showCommandPalette) return null

  const q = query.toLowerCase()
  const results = tickets.filter(t =>
    t.id.toLowerCase().includes(q) ||
    t.title.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  ).slice(0, 15)

  const handleSelect = (ticketId: string) => {
    if (activeProjectId) {
      fetchTicketDetail(activeProjectId, ticketId)
      setShowCommandPalette(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      handleSelect(results[selectedIdx].id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowCommandPalette(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm"
        onClick={() => setShowCommandPalette(false)}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-zinc-950/80">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <MagnifyingGlass size={16} className="text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets..."
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">esc</kbd>
        </div>

        <div className="max-h-80 overflow-auto py-1">
          {results.length === 0 && query && (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">No results</div>
          )}
          {results.map((ticket, idx) => (
            <button
              key={ticket.id}
              onClick={() => handleSelect(ticket.id)}
              onMouseEnter={() => setSelectedIdx(idx)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                idx === selectedIdx ? 'bg-zinc-800' : ''
              }`}
            >
              <span className="font-mono text-xs text-zinc-500">{ticket.id}</span>
              <span className="flex-1 truncate text-sm text-zinc-300">{ticket.title}</span>
              <PriorityIcon priority={ticket.priority} />
              <StatusDot status={ticket.status} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
