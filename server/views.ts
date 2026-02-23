/**
 * Saved views persistence — per-project views stored in
 * ~/.ramboard/<project>/views.json
 */
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import type { SavedView } from '../src/lib/types'

const CONFIG_DIR = join(homedir(), '.ramboard')

function viewsDir(projectId: string): string {
  return join(CONFIG_DIR, projectId)
}

function viewsPath(projectId: string): string {
  return join(viewsDir(projectId), 'views.json')
}

function ensureDir(projectId: string): void {
  const dir = viewsDir(projectId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function genId(): string {
  return randomUUID().slice(0, 8)
}

// ── CRUD ──────────────────────────────────────────────────────

export function readViews(projectId: string): SavedView[] {
  const path = viewsPath(projectId)
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return []
  }
}

export function writeViews(projectId: string, views: SavedView[]): void {
  ensureDir(projectId)
  writeFileSync(viewsPath(projectId), JSON.stringify(views, null, 2) + '\n')
}

export function getView(projectId: string, viewId: string): SavedView | undefined {
  return readViews(projectId).find(v => v.id === viewId)
}

export function createView(projectId: string, view: Omit<SavedView, 'id'>): SavedView {
  const views = readViews(projectId)
  const saved: SavedView = { ...view, id: genId() }
  views.push(saved)
  writeViews(projectId, views)
  return saved
}

export function updateView(projectId: string, viewId: string, patch: Partial<SavedView>): SavedView | null {
  const views = readViews(projectId)
  const idx = views.findIndex(v => v.id === viewId)
  if (idx === -1) return null
  views[idx] = { ...views[idx], ...patch, id: viewId }
  // Explicitly null fields → delete them (allows clearing optional properties like boardSort)
  for (const key of Object.keys(views[idx]) as (keyof SavedView)[]) {
    if (views[idx][key] === null) delete (views[idx] as unknown as Record<string, unknown>)[key]
  }
  writeViews(projectId, views)
  return views[idx]
}

export function deleteView(projectId: string, viewId: string): boolean {
  const views = readViews(projectId)
  const filtered = views.filter(v => v.id !== viewId)
  if (filtered.length === views.length) return false
  writeViews(projectId, filtered)
  return true
}

// ── Default views ─────────────────────────────────────────────

const DEFAULT_LIST_VIEW: SavedView = {
  id: 'default',
  name: 'Open & In Progress',
  mode: 'list',
  list: {
    name: 'Open & In Progress',
    filters: [{ id: 'default-status', field: 'status', operator: 'any_of', value: ['open', 'in_progress'] }],
    sortField: 'created',
    sortDir: 'desc',
  },
}

const DEFAULT_BOARD_VIEW: SavedView = {
  id: 'status-board',
  name: 'Status Board',
  mode: 'board',
  columns: [
    { name: 'Open', filters: [{ id: 'col-open', field: 'status', operator: 'any_of', value: ['open'] }], sortField: 'priority', sortDir: 'asc' },
    { name: 'In Progress', filters: [{ id: 'col-ip', field: 'status', operator: 'any_of', value: ['in_progress'] }], sortField: 'priority', sortDir: 'asc' },
    { name: 'Closed', filters: [{ id: 'col-closed', field: 'status', operator: 'any_of', value: ['closed'] }], sortField: 'created', sortDir: 'desc' },
  ],
}

/** Seed default views if project has none */
export function seedDefaultViews(projectId: string): void {
  const views = readViews(projectId)
  if (views.length > 0) return
  writeViews(projectId, [DEFAULT_LIST_VIEW, DEFAULT_BOARD_VIEW])
}
