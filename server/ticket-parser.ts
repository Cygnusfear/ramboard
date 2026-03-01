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

  const results = await Promise.all(
    mdFiles.map(async (file) => {
      try {
        const filePath = join(ticketsPath, file)
        const [content, fileStat] = await Promise.all([readFile(filePath, 'utf-8'), stat(filePath)])
        return parseTicket(content, projectId, fileStat.mtime)
      } catch (e) {
        console.warn(`[ticket-parser] skipping ${file}: ${e}`)
        return null
      }
    })
  )

  return results.filter((t): t is Ticket => t !== null)
}

/** Normalize a YAML list field — handles null, string, comma-separated string, or array */
function normalizeList(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).map(s => s.trim()).filter(Boolean)
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean)
  return []
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
    tags: normalizeList(meta.tags),
    deps: normalizeList(meta.deps),
    links: normalizeList(meta.links),
    created: meta.created || '',
    modified: mtime?.toISOString() ?? meta.created ?? '',
    assignee: meta.assignee,
    title,
    body: body.trim(),
    project: projectId,
  }
}
