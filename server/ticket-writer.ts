import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export interface TicketUpdate {
  status?: string
  priority?: number
  type?: string
  tags?: string[]
  body?: string
}

export async function updateTicketFile(
  ticketsPath: string,
  ticketId: string,
  update: TicketUpdate
): Promise<boolean> {
  const filePath = join(ticketsPath, `${ticketId}.md`)

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return false
  }

  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return false

  const [, frontmatter, body] = match
  const meta = parseYaml(frontmatter)

  if (update.status !== undefined) meta.status = update.status
  if (update.priority !== undefined) meta.priority = update.priority
  if (update.type !== undefined) meta.type = update.type
  if (update.tags !== undefined) meta.tags = update.tags

  const finalBody = update.body !== undefined ? update.body : body
  const newContent = `---\n${stringifyYaml(meta).trim()}\n---\n${finalBody}`
  await writeFile(filePath, newContent, 'utf-8')
  return true
}

export async function toggleCheckbox(
  ticketsPath: string,
  ticketId: string,
  checkboxIndex: number
): Promise<boolean> {
  const filePath = join(ticketsPath, `${ticketId}.md`)

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return false
  }

  let idx = 0
  const newContent = content.replace(/\[( |x|X)\]/g, (match) => {
    if (idx === checkboxIndex) {
      idx++
      return match === '[ ]' ? '[x]' : '[ ]'
    }
    idx++
    return match
  })

  await writeFile(filePath, newContent, 'utf-8')
  return true
}
