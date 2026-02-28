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
  updateTicketType: (projectId: string, ticketId: string, type: string) => Promise<void>
  updateTicketTags: (projectId: string, ticketId: string, tags: string[]) => Promise<void>
  updateTicketBody: (projectId: string, ticketId: string, body: string) => Promise<void>
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
      activeTicket: state.activeTicket?.id === ticketId
        ? { ...state.activeTicket, status: status as TicketSummary['status'] }
        : state.activeTicket,
    }))
  },

  updateTicketPriority: async (projectId, ticketId, priority) => {
    await updateTicket(projectId, ticketId, { priority })
    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId ? { ...t, priority } : t
      ),
      activeTicket: state.activeTicket?.id === ticketId
        ? { ...state.activeTicket, priority }
        : state.activeTicket,
    }))
  },

  updateTicketType: async (projectId, ticketId, type) => {
    await updateTicket(projectId, ticketId, { type })
    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId ? { ...t, type } : t
      ),
      activeTicket: state.activeTicket?.id === ticketId
        ? { ...state.activeTicket, type }
        : state.activeTicket,
    }))
  },

  updateTicketTags: async (projectId, ticketId, tags) => {
    await updateTicket(projectId, ticketId, { tags })
    set(state => ({
      tickets: state.tickets.map(t =>
        t.id === ticketId ? { ...t, tags } : t
      ),
      activeTicket: state.activeTicket?.id === ticketId
        ? { ...state.activeTicket, tags }
        : state.activeTicket,
    }))
  },

  updateTicketBody: async (projectId, ticketId, body) => {
    await updateTicket(projectId, ticketId, { body })
    set(state => ({
      activeTicket: state.activeTicket?.id === ticketId
        ? { ...state.activeTicket, body }
        : state.activeTicket,
    }))
  },
}))
