# Ramboard

Multi-project ticket board for [tk](https://github.com/wedow/ticket). Reads `.tickets/` directories from local repos. Kanban and list views. Vim bindings. Full markdown. Read-write.

<img width="3676" height="2378" alt="Board view" src="https://github.com/user-attachments/assets/89509b3d-6b7f-4c66-9355-d63ceb2939a5" />
<img width="3676" height="2378" alt="List view" src="https://github.com/user-attachments/assets/571d634e-b70f-4a0a-b70c-acb4b179cb67" />

## Why

AI coding agents generate tickets. [pi-stuff](https://github.com/cygnusfear/pi-stuff) routes all agent coordination through `tk` — task delegation, progress tracking, inter-agent handoff. Tickets accumulate in `.tickets/` directories across every project.

Ramboard gives you one board to see them all. Point it at your repos, get a Linear-style UI over plain markdown files. No database, no sync — the filesystem is the source of truth.

## Install

```bash
bun install
```

## Run

```bash
bun run dev
```

Configure which repos to watch in `ramboard.config.ts`.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun |
| Server | `Bun.serve()` — no frameworks |
| Frontend | React 19 + Vite + Tailwind v4 |
| State | Zustand |
| DnD | @dnd-kit |
| UI primitives | @base-ui-components/react (headless) |
| Command palette | cmdk |
| Icons | @phosphor-icons/react |
| Fonts | Geist + Geist Mono |
| Animation | CSS first, anime.js for spring physics |

## Features

- **Board view** — kanban columns by status, drag cards between columns, drag to reorder columns
- **List view** — sortable table with inline status and priority
- **Filters** — status, priority, tags, type, assignee, project
- **Search** — fuzzy filter across all tickets
- **Vim bindings** — `j`/`k` navigation, `Enter` to open, `Esc` to deselect
- **Command palette** — `Cmd+K` for quick actions
- **Multi-select** — bulk status and priority changes
- **Full-page detail** — markdown rendering with GFM support
- **Multi-project** — one board across all your repos

## How it works with pi-stuff

[pi-stuff](https://github.com/cygnusfear/pi-stuff) extensions use `tk` tickets as the coordination layer between agents:

- **teams** spawns parallel workers, each claiming tickets from a shared queue
- **todos-tk** creates, lists, and completes tickets from inside pi sessions
- **Oracle & Delphi** write research findings as tickets

Ramboard renders these same tickets as a visual board. Agents write `.tickets/` files; you drag them across columns.

## License

MIT
