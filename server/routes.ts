import { join } from 'path'
import config from '../ramboard.config'
import { parseTicketsDir, type Ticket } from './ticket-parser'
import { updateTicketFile, toggleCheckbox, type TicketUpdate } from './ticket-writer'

function getProject(id: string) {
  return config.projects.find(p => p.id === id)
}

function ticketsPath(projectPath: string): string {
  return join(projectPath, '.tickets')
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handleApi(req: Request): Promise<Response | null> {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method

  // GET /api/projects
  if (method === 'GET' && path === '/api/projects') {
    const projects = await Promise.all(
      config.projects.map(async (p) => {
        const tickets = await parseTicketsDir(ticketsPath(p.path), p.id)
        const counts = { open: 0, in_progress: 0, closed: 0, cancelled: 0 }
        for (const t of tickets) {
          counts[t.status as keyof typeof counts]++
        }
        return { id: p.id, name: p.name, counts, total: tickets.length }
      })
    )
    return json(projects)
  }

  // GET /api/projects/:id/tickets
  const ticketListMatch = path.match(/^\/api\/projects\/([^\/]+)\/tickets$/)
  if (method === 'GET' && ticketListMatch) {
    const project = getProject(ticketListMatch[1])
    if (!project) return json({ error: 'project not found' }, 404)

    let tickets = await parseTicketsDir(ticketsPath(project.path), project.id)

    // Filter by query params
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const tag = url.searchParams.get('tag')

    if (status) tickets = tickets.filter(t => t.status === status)
    if (priority) tickets = tickets.filter(t => t.priority === Number(priority))
    if (tag) tickets = tickets.filter(t => t.tags.includes(tag))

    // Sort
    const sort = url.searchParams.get('sort') || 'priority'
    const dir = url.searchParams.get('dir') === 'desc' ? -1 : 1
    tickets.sort((a, b) => {
      if (sort === 'priority') return (a.priority - b.priority) * dir
      if (sort === 'created') return a.created.localeCompare(b.created) * dir
      if (sort === 'title') return a.title.localeCompare(b.title) * dir
      if (sort === 'status') return a.status.localeCompare(b.status) * dir
      return 0
    })

    // Strip body for list response (lighter payload)
    const light = tickets.map(({ body, ...rest }) => rest)
    return json(light)
  }

  // GET /api/projects/:id/tickets/:tid
  const ticketDetailMatch = path.match(/^\/api\/projects\/([^\/]+)\/tickets\/([^\/]+)$/)
  if (method === 'GET' && ticketDetailMatch) {
    const project = getProject(ticketDetailMatch[1])
    if (!project) return json({ error: 'project not found' }, 404)

    const tickets = await parseTicketsDir(ticketsPath(project.path), project.id)
    const ticket = tickets.find(t => t.id === ticketDetailMatch[2])
    if (!ticket) return json({ error: 'ticket not found' }, 404)

    return json(ticket)
  }

  // PATCH /api/projects/:id/tickets/:tid
  if (method === 'PATCH' && ticketDetailMatch) {
    const project = getProject(ticketDetailMatch[1])
    if (!project) return json({ error: 'project not found' }, 404)

    const update: TicketUpdate = await req.json()
    const success = await updateTicketFile(
      ticketsPath(project.path),
      ticketDetailMatch[2],
      update
    )

    if (!success) return json({ error: 'ticket not found' }, 404)

    // Run tk command for status changes
    if (update.status) {
      const tid = ticketDetailMatch[2]
      let cmd: string | null = null
      if (update.status === 'in_progress') cmd = `tk start ${tid}`
      else if (update.status === 'closed') cmd = `tk close ${tid}`
      else if (update.status === 'open') cmd = `tk reopen ${tid}`

      if (cmd) {
        try {
          const proc = Bun.spawn(['sh', '-c', cmd], { cwd: project.path })
          await proc.exited
        } catch (e) {
          console.warn(`[tk] command failed: ${cmd}`, e)
        }
      }
    }

    return json({ ok: true })
  }

  // POST /api/projects/:id/tickets/:tid/checkbox
  const checkboxMatch = path.match(/^\/api\/projects\/([^\/]+)\/tickets\/([^\/]+)\/checkbox$/)
  if (method === 'POST' && checkboxMatch) {
    const project = getProject(checkboxMatch[1])
    if (!project) return json({ error: 'project not found' }, 404)

    const { index } = await req.json()
    const success = await toggleCheckbox(
      ticketsPath(project.path),
      checkboxMatch[2],
      index
    )

    if (!success) return json({ error: 'ticket not found' }, 404)
    return json({ ok: true })
  }

  return null // not an API route
}
