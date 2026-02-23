import { create } from 'zustand'
import type { TicketSummary, Ticket, SortField, SortDir } from '@/lib/types'
import { getTickets, getTicket, updateTicket } from '@/lib/api'

interface TicketState {
  tickets: TicketSummary[]
  activeTicket: Ticket | null
  loading: boolean
  sortField: SortField
  sortDir: SortDir
  filterStatus: string | null
  filterPriority: number | null
  filterTag: string | null

  fetchTickets: (projectId: string) => Promise<void>
  fetchTicketDetail: (projectId: string, ticketId: string) => Promise<void>
  clearActiveTicket: () => void
  updateTicketStatus: (projectId: string, ticketId: string, status: string) => Promise<void>
  updateTicketPriority: (projectId: string, ticketId: string, priority: number) => Promise<void>
  setSort: (field: SortField) => void
  setFilterStatus: (status: string | null) => void
  setFilterPriority: (priority: number | null) => void
  setFilterTag: (tag: string | null) => void
  filteredTickets: () => TicketSummary[]
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  activeTicket: null,
  loading: false,
  sortField: 'priority',
  sortDir: 'asc',
  filterStatus: null,
  filterPriority: null,
  filterTag: null,

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
    // Optimistic update
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

  setSort: (field) => set(state => ({
    sortField: field,
    sortDir: state.sortField === field && state.sortDir === 'asc' ? 'desc' : 'asc',
  })),

  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterTag: (tag) => set({ filterTag: tag }),

  filteredTickets: () => {
    const { tickets, filterStatus, filterPriority, filterTag, sortField, sortDir } = get()
    let result = [...tickets]

    if (filterStatus) result = result.filter(t => t.status === filterStatus)
    if (filterPriority !== null) result = result.filter(t => t.priority === filterPriority)
    if (filterTag) result = result.filter(t => t.tags.includes(filterTag))

    const dir = sortDir === 'asc' ? 1 : -1
    result.sort((a, b) => {
      if (sortField === 'priority') return (a.priority - b.priority) * dir
      if (sortField === 'created') return a.created.localeCompare(b.created) * dir
      if (sortField === 'title') return a.title.localeCompare(b.title) * dir
      if (sortField === 'status') return a.status.localeCompare(b.status) * dir
      return 0
    })

    return result
  },
}))
