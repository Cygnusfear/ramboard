#!/usr/bin/env bun
/**
 * `board` — CLI entry point for Ramboard.
 *
 * Usage:
 *   board            Run from any project dir with .tickets/ — adds it, starts server, opens browser
 *   board add <path> Manually add a project directory
 *   board rm <id>    Remove a project from the sidebar
 *   board ls         List configured projects
 *   board server     Start server only (no browser)
 */
import { resolve } from 'path'
import { existsSync } from 'fs'
import { readConfig, addProject, removeProject, hasTickets, dirToId } from '../server/config'

const RAMBOARD_DIR = resolve(import.meta.dir, '..')
const API_PORT = readConfig().server.port
const CLIENT_PORT = 4001
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`
const API_URL = `http://localhost:${API_PORT}`

// ── Helpers ───────────────────────────────────────────────────

async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/projects`, { signal: AbortSignal.timeout(1000) })
    return res.ok
  } catch {
    return false
  }
}

async function startServer(): Promise<void> {
  console.log('Starting Ramboard server...')
  // Start API server in background
  Bun.spawn(['bun', 'run', '--hot', 'server/index.ts'], {
    cwd: RAMBOARD_DIR,
    stdio: ['ignore', 'ignore', 'ignore'],
  })
  // Start Vite dev server in background
  Bun.spawn(['bun', 'run', 'dev:client'], {
    cwd: RAMBOARD_DIR,
    stdio: ['ignore', 'ignore', 'ignore'],
  })
  // Wait for API to be ready
  for (let i = 0; i < 30; i++) {
    if (await isServerRunning()) return
    await Bun.sleep(200)
  }
  console.error('Server failed to start within 6s')
  process.exit(1)
}

function openBrowser(url: string): void {
  const platform = process.platform
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open'
  Bun.spawn([cmd, url], { stdio: ['ignore', 'ignore', 'ignore'] })
}

// ── Commands ──────────────────────────────────────────────────

const [cmd, ...args] = process.argv.slice(2)

if (cmd === 'ls' || cmd === 'list') {
  const config = readConfig()
  if (config.projects.length === 0) {
    console.log('No projects configured. Run `board` from a project directory to add one.')
  } else {
    console.log('Projects:')
    for (const p of config.projects) {
      const tickets = existsSync(resolve(p.path, '.tickets'))
      console.log(`  ${p.id.padEnd(20)} ${p.name.padEnd(16)} ${p.path} ${tickets ? '✓' : '✗ missing'}`)
    }
  }
  process.exit(0)
}

if (cmd === 'add') {
  const dir = resolve(args[0] ?? process.cwd())
  if (!hasTickets(dir)) {
    console.error(`No .tickets/ found in ${dir}`)
    process.exit(1)
  }
  const entry = addProject(dir)
  console.log(`Added: ${entry.id} (${entry.name}) — ${entry.path}`)
  process.exit(0)
}

if (cmd === 'rm' || cmd === 'remove') {
  if (!args[0]) { console.error('Usage: board rm <project-id>'); process.exit(1) }
  const removed = removeProject(args[0])
  console.log(removed ? `Removed: ${args[0]}` : `Not found: ${args[0]}`)
  process.exit(0)
}

if (cmd === 'server') {
  // Just start server, no browser
  if (await isServerRunning()) {
    console.log('Server already running.')
  } else {
    await startServer()
    console.log('Server started.')
  }
  process.exit(0)
}

// ── Default: auto-add CWD + start + open browser ─────────────

const cwd = process.cwd()
let projectId: string | null = null

// If CWD has .tickets/, add it
if (hasTickets(cwd)) {
  const entry = addProject(cwd)
  projectId = entry.id
  console.log(`Project: ${entry.name} (${entry.id})`)
}

// Start server if not running
if (!(await isServerRunning())) {
  await startServer()
  console.log('Server started.')
} else {
  console.log('Server already running.')
}

// Open browser — navigate to project page if we have one
const url = projectId ? `${CLIENT_URL}/${projectId}` : CLIENT_URL
openBrowser(url)
console.log(`Opened: ${url}`)
