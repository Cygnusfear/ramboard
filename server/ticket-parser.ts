import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'

export interface Ticket {
  id: string
  status: 'open' | 'in_progress' | 'closed' | 'cancelled'
  type: string
  priority: number
  tags: string[]
  deps: string[]
  links: string[]
  created: string
  modified: string
  assignee?: string
  title: string
  body: string
  project: string
}

export async function parseTicketsDir(ticketsPath: string, projectId: string): Promise<Ticket[]> {
  let files: string[]
  try {
    files = await readdir(ticketsPath)
  } catch {
    return []
  }

  const mdFiles = files.filter(f => f.endsWith('.md'))
  const tickets: Ticket[] = []

  for (const file of mdFiles) {
    try {
      const filePath = join(ticketsPath, file)
      const [content, fileStat] = await Promise.all([readFile(filePath, 'utf-8'), stat(filePath)])
      const ticket = parseTicket(content, projectId, fileStat.mtime)
      if (ticket) tickets.push(ticket)
    } catch (e) {
      console.warn(`[ticket-parser] skipping ${file}: ${e}`)
    }
  }

  return tickets
}

function parseTicket(content: string, projectId: string, mtime?: Date): Ticket | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null

  const [, frontmatter, body] = match
  let meta: any
  try {
    meta = parseYaml(frontmatter)
  } catch {
    return null
  }

  if (!meta?.id) return null

  const titleMatch = body.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : meta.id

  return {
    id: meta.id,
    status: meta.status || 'open',
    type: meta.type || 'task',
    priority: meta.priority ?? 2,
    tags: meta.tags || [],
    deps: meta.deps || [],
    links: meta.links || [],
    created: meta.created || '',
    modified: mtime?.toISOString() ?? meta.created ?? '',
    assignee: meta.assignee,
    title,
    body: body.trim(),
    project: projectId,
  }
}
