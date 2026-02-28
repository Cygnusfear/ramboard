import type { ProjectSummary, TicketSummary, Ticket } from './types'

const BASE = '/api'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, init)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getProjects(): Promise<ProjectSummary[]> {
  return fetchJson('/projects')
}

export async function deleteProject(projectId: string): Promise<void> {
  await fetchJson(`/projects/${projectId}`, { method: 'DELETE' })
}

export async function reorderProjects(ids: string[]): Promise<void> {
  await fetchJson('/projects/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}

export async function getTickets(projectId: string, params?: Record<string, string>): Promise<TicketSummary[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return fetchJson(`/projects/${projectId}/tickets${qs}`)
}

export async function getTicket(projectId: string, ticketId: string): Promise<Ticket> {
  return fetchJson(`/projects/${projectId}/tickets/${ticketId}`)
}

export async function updateTicket(projectId: string, ticketId: string, update: Record<string, unknown>): Promise<void> {
  await fetchJson(`/projects/${projectId}/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  })
}

export async function toggleCheckbox(projectId: string, ticketId: string, index: number): Promise<void> {
  await fetchJson(`/projects/${projectId}/tickets/${ticketId}/checkbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index }),
  })
}
