import { create } from 'zustand'
import type { TicketSummary, Ticket } from '@/lib/types'
import { getTickets, getTicket, updateTicket } from '@/lib/api'

interface TicketState {
  tickets: TicketSummary[]
  activeTicket: Ticket | null
  loading: boolean

  fetchTickets: (projectId: string) => Promise<void>
  fetchTicketDetail: (projectId: string, ticketId: string) => Promise<void>
  clearActiveTicket: () => void
  updateTicketStatus: (projectId: string, ticketId: string, status: string) => Promise<void>
  updateTicketPriority: (projectId: string, ticketId: string, priority: number) => Promise<void>
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  activeTicket: null,
  loading: false,

  fetchTickets: async (projectId) => {
    set({ loading: true })
    try {
      const tickets = await getTickets(projectId)
      set({ tickets, loading: false })
    } catch (e) {
      console.error('Failed to fetch tickets:', e)
      set({ loading: false })
    }
  },

  fetchTicketDetail: async (projectId, ticketId) => {
    set({ loading: true })
    try {
      const ticket = await getTicket(projectId, ticketId)
      set({ activeTicket: ticket, loading: false })
    } catch (e) {
      console.error('Failed to fetch ticket:', e)
      set({ loading: false })
    }
  },

  clearActiveTicket: () => set({ activeTicket: null }),

  updateTicketStatus: async (projectId, ticketId, status) => {
    await updateTicket(projectId, ticketId, { status })
    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId ? { ...t, status: status as TicketSummary['status'] } : t
      ),
    }))
  },

  updateTicketPriority: async (projectId, ticketId, priority) => {
    await updateTicket(projectId, ticketId, { priority })
    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId ? { ...t, priority } : t
      ),
    }))
  },
}))
