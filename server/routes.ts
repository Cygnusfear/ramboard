import { join } from 'path'
import { readConfig, addProject, removeProject, reorderProjects, hasTickets } from './config'
import { parseTicketsDir, type Ticket } from './ticket-parser'
import { updateTicketFile, toggleCheckbox, type TicketUpdate } from './ticket-writer'
import { readViews, createView, updateView, deleteView, seedDefaultViews } from './views'

function getProject(id: string) {
  return readConfig().projects.find(p => p.id === id)
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

  // ── Project management ────────────────────────────────────

  // GET /api/projects — lightweight, no ticket parsing
  if (method === 'GET' && path === '/api/projects') {
    const { projects } = readConfig()
    return json(projects.map(p => ({ id: p.id, name: p.name })))
  }

  // POST /api/projects — add a project { path: "/abs/path" }
  if (method === 'POST' && path === '/api/projects') {
    const body = await req.json() as { path?: string }
    if (!body.path) return json({ error: 'path required' }, 400)
    if (!hasTickets(body.path)) return json({ error: 'no .tickets/ in that directory' }, 400)
    const entry = addProject(body.path)
    return json(entry, 201)
  }

  // PUT /api/projects/reorder — reorder projects { ids: ["id1", "id2", ...] }
  if (method === 'PUT' && path === '/api/projects/reorder') {
    const body = await req.json() as { ids?: string[] }
    if (!body.ids || !Array.isArray(body.ids)) return json({ error: 'ids array required' }, 400)
    const ok = reorderProjects(body.ids)
    return ok ? json({ ok: true }) : json({ error: 'invalid ids' }, 400)
  }

  // DELETE /api/projects/:id — remove a project
  const deleteProjectMatch = path.match(/^\/api\/projects\/([^\/]+)$/)
  if (method === 'DELETE' && deleteProjectMatch) {
    const removed = removeProject(deleteProjectMatch[1])
    return removed ? json({ ok: true }) : json({ error: 'not found' }, 404)
  }

  // ── Tickets ───────────────────────────────────────────────

  // GET /api/projects/:id/tickets
  const ticketListMatch = path.match(/^\/api\/projects\/([^\/]+)\/tickets$/)
  if (method === 'GET' && ticketListMatch) {
    const project = getProject(ticketListMatch[1])
    if (!project) return json({ error: 'project not found' }, 404)

    let tickets = await parseTicketsDir(ticketsPath(project.path), project.id)

    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const tag = url.searchParams.get('tag')

    if (status) tickets = tickets.filter(t => t.status === status)
    if (priority) tickets = tickets.filter(t => t.priority === Number(priority))
    if (tag) tickets = tickets.filter(t => Array.isArray(t.tags) && t.tags.includes(tag))

    const sort = url.searchParams.get('sort') || 'priority'
    const dir = url.searchParams.get('dir') === 'desc' ? -1 : 1
    tickets.sort((a, b) => {
      if (sort === 'priority') return (a.priority - b.priority) * dir
      if (sort === 'created') return a.created.localeCompare(b.created) * dir
      if (sort === 'modified') return a.modified.localeCompare(b.modified) * dir
      if (sort === 'title') return a.title.localeCompare(b.title) * dir
      if (sort === 'status') return a.status.localeCompare(b.status) * dir
      return 0
    })

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
      update,
    )

    if (!success) return json({ error: 'ticket not found' }, 404)

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
      index,
    )

    if (!success) return json({ error: 'ticket not found' }, 404)
    return json({ ok: true })
  }

  // ── Views ────────────────────────────────────────────────────

  // GET /api/projects/:id/views
  const viewsListMatch = path.match(/^\/api\/projects\/([^\/]+)\/views$/)
  if (method === 'GET' && viewsListMatch) {
    const projectId = viewsListMatch[1]
    if (!getProject(projectId)) return json({ error: 'project not found' }, 404)
    seedDefaultViews(projectId)
    return json(readViews(projectId))
  }

  // POST /api/projects/:id/views
  if (method === 'POST' && viewsListMatch) {
    const projectId = viewsListMatch[1]
    if (!getProject(projectId)) return json({ error: 'project not found' }, 404)
    const body = await req.json()
    const view = createView(projectId, body)
    return json(view, 201)
  }

  // PUT /api/projects/:id/views/:viewId
  const viewDetailMatch = path.match(/^\/api\/projects\/([^\/]+)\/views\/([^\/]+)$/)
  if (method === 'PUT' && viewDetailMatch) {
    const [, projectId, viewId] = viewDetailMatch
    if (!getProject(projectId)) return json({ error: 'project not found' }, 404)
    const body = await req.json()
    const updated = updateView(projectId, viewId, body)
    return updated ? json(updated) : json({ error: 'view not found' }, 404)
  }

  // DELETE /api/projects/:id/views/:viewId
  if (method === 'DELETE' && viewDetailMatch) {
    const [, projectId, viewId] = viewDetailMatch
    if (!getProject(projectId)) return json({ error: 'project not found' }, 404)
    return deleteView(projectId, viewId) ? json({ ok: true }) : json({ error: 'view not found' }, 404)
  }

  return null
}
