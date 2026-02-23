import { useEffect, useRef } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'

export function useKeyboard() {
  const gPending = useRef(false)
  const gTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable

      // Command palette always works
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUIStore.getState().setShowCommandPalette(true)
        return
      }

      if (isInput) return

      const ui = useUIStore.getState()
      const tickets = useTicketStore.getState().filteredTickets()
      const projects = useProjectStore.getState()
      const ticketStore = useTicketStore.getState()

      // Number keys — switch project
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        if (idx < projects.projects.length) {
          projects.setActiveProject(projects.projects[idx].id)
        }
        return
      }

      switch (e.key) {
        case 'j':
          e.preventDefault()
          ui.moveHighlight(1, tickets.length)
          break
        case 'k':
          e.preventDefault()
          ui.moveHighlight(-1, tickets.length)
          break
        case 'g':
          if (gPending.current) {
            // gg — go to first
            e.preventDefault()
            ui.setHighlightIndex(0)
            gPending.current = false
            clearTimeout(gTimeout.current)
          } else {
            gPending.current = true
            gTimeout.current = setTimeout(() => { gPending.current = false }, 300)
          }
          break
        case 'G':
          e.preventDefault()
          ui.setHighlightIndex(tickets.length - 1)
          break
        case 'd':
          if (e.ctrlKey) {
            e.preventDefault()
            ui.moveHighlight(Math.floor(tickets.length / 2), tickets.length)
          }
          break
        case 'u':
          if (e.ctrlKey) {
            e.preventDefault()
            ui.moveHighlight(-Math.floor(tickets.length / 2), tickets.length)
          }
          break
        case 'H':
          e.preventDefault()
          const pIdx = projects.projects.findIndex(p => p.id === projects.activeProjectId)
          if (pIdx > 0) projects.setActiveProject(projects.projects[pIdx - 1].id)
          break
        case 'L':
          e.preventDefault()
          const nIdx = projects.projects.findIndex(p => p.id === projects.activeProjectId)
          if (nIdx < projects.projects.length - 1) projects.setActiveProject(projects.projects[nIdx + 1].id)
          break
        case 'Enter':
          e.preventDefault()
          if (tickets[ui.highlightIndex] && projects.activeProjectId) {
            ticketStore.fetchTicketDetail(projects.activeProjectId, tickets[ui.highlightIndex].id)
          }
          break
        case 'Escape':
          e.preventDefault()
          if (ticketStore.activeTicket) {
            ticketStore.clearActiveTicket()
          } else if (ui.selectedIds.size > 0) {
            ui.clearSelection()
          } else if (ui.showCommandPalette) {
            ui.setShowCommandPalette(false)
          } else if (ui.showKeyboardHelp) {
            ui.setShowKeyboardHelp(false)
          }
          break
        case 'x':
          e.preventDefault()
          if (tickets[ui.highlightIndex]) {
            ui.toggleSelection(tickets[ui.highlightIndex].id)
          }
          break
        case 'o':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            if (tickets[ui.highlightIndex] && projects.activeProjectId) {
              ticketStore.updateTicketStatus(projects.activeProjectId, tickets[ui.highlightIndex].id, 'open')
            }
          }
          break
        case 'i':
          e.preventDefault()
          if (tickets[ui.highlightIndex] && projects.activeProjectId) {
            ticketStore.updateTicketStatus(projects.activeProjectId, tickets[ui.highlightIndex].id, 'in_progress')
          }
          break
        case 'c':
          e.preventDefault()
          if (tickets[ui.highlightIndex] && projects.activeProjectId) {
            ticketStore.updateTicketStatus(projects.activeProjectId, tickets[ui.highlightIndex].id, 'closed')
          }
          break
        case 'v':
          e.preventDefault()
          ui.toggleViewMode()
          break
        case '?':
          e.preventDefault()
          ui.setShowKeyboardHelp(!ui.showKeyboardHelp)
          break
        case '/':
          e.preventDefault()
          ui.setShowCommandPalette(true)
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
