# Ramboard Design Spec

Multi-project kanban board that reads `.tickets/` directories. Linear-style UI with Discord-style project navigation. Vim bindings. Full markdown rendering. Read-write.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Bun | Fast, native TS, single binary |
| Server | `Bun.serve()` | No framework. Route matching + static files |
| Frontend | React 19 + Vite | HMR in dev, static build for prod |
| Styling | Tailwind v4 | Utility-first, no custom CSS files |
| Animation | CSS first, `animejs` (v4) fallback | CSS for hover/focus/stagger/transitions. anime.js for spring physics + orchestration |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Best React DnD lib, Linear uses it |
| Markdown | `react-markdown` + `remark-gfm` | GFM tables, checkboxes, code blocks |
| UI Primitives | `@base-ui-components/react` | Headless components — all buttons, toggles, popovers, dialogs, context menus, checkboxes, selects. Styled with Tailwind. |
| Command Palette | `cmdk` | Fuzzy search, keyboard nav, a11y. Wrapped in Base UI Dialog. |
| Icons | `@phosphor-icons/react` | No emoji. Ever. |
| Fonts | `Geist` + `Geist Mono` | Clean engineering aesthetic |
| State | Zustand | Lightweight, no boilerplate |

**No framer-motion. No sliding panels.** But this is not a dead UI either. **CSS first** for all motion — `transition`, `@keyframes`, `animation-delay` cascades. CSS handles hover states, focus rings, color shifts, scale transforms, opacity fades, and staggered entry via `calc(var(--i) * 40ms)`. Reach for `anime.js` only when CSS can't do it: spring physics on drag-drop settle, complex orchestrated sequences, dynamic stagger counts unknown at CSS time. Animations serve comprehension (where did that card go?) not decoration. Keep durations short (100-250ms), easing natural (`cubic-bezier(0.16, 1, 0.3, 1)` for CSS, `easeOutExpo`/spring for anime.js).

## Color System

- **Base:** Zinc-950 background (`#09090b`), Zinc-900 surfaces (`#18181b`), Zinc-800 borders (`#27272a`)
- **Text:** Zinc-100 primary (`#f4f4f5`), Zinc-400 secondary (`#a1a1aa`), Zinc-500 muted (`#71717a`)
- **Accent:** Blue-500 (`#3b82f6`) — selection, active states, primary actions only
- **Status dots:** Emerald (open), Amber (in progress), Zinc-500 (closed), Red (cancelled)
- **Tag pills:** Muted, desaturated backgrounds with matching text. No neon. No purple.
- **Priority:** Urgent=Red-500, High=Orange-500, Medium=Blue-500, Low=Zinc-500

No pure black (`#000`). No pure white (`#fff`). Off-black and off-white only.

## Typography

```
Headlines:  Geist, text-lg, font-medium, tracking-tight
Body:       Geist, text-sm, text-zinc-300
Mono:       Geist Mono, text-xs — ticket IDs, timestamps, code
Labels:     Geist, text-xs, uppercase, tracking-wider, text-zinc-500
```

No serif fonts. No Inter.

## UI Primitives (Base UI)

**All interactive elements use Base UI headless components.** No hand-rolled dropdowns, modals, or toggles. Base UI handles accessibility, focus management, click-outside dismissal, and keyboard navigation. We style everything with Tailwind via `className` and Base UI data attributes (`data-[pressed]`, `data-[highlighted]`, `data-[popup-open]`, `data-[starting-style]`, `data-[ending-style]`).

| Element | Base UI Component | Location |
|---------|-------------------|----------|
| View toggle (List/Board) | `ToggleGroup` + `Toggle` | `header-bar.tsx` |
| Filter dropdowns | `Popover` | `filter-bar.tsx` |
| Filter checkboxes | `Checkbox` + `Checkbox.Indicator` | `filter-bar.tsx` |
| Command palette | `cmdk` Command + Base UI `Dialog` | `command-palette.tsx` |
| Keyboard help | `Dialog` | `keyboard-help.tsx` |
| Row context menu | `ContextMenu` | `ticket-context-menu.tsx` |
| Bulk action bar | Plain buttons (status actions only) | `bulk-action-bar.tsx` |

**Pattern for new interactive elements:** Always reach for Base UI first. Import from `@base-ui/react/<component>`. Use the compound component pattern (`Component.Root > Component.Trigger > Component.Portal > Component.Positioner > Component.Popup`). Style with Tailwind on each part. Use `data-[state]` attributes for conditional styling instead of manual className ternaries.

## Layout Architecture

```
┌──────────────────────────────────────────────────────────┐
│ ┌────┐ ┌──────────────────────────────────────────────┐  │
│ │    │ │ Header: view toggle + filters + search       │  │
│ │ P  │ ├──────────────────────────────────────────────┤  │
│ │ R  │ │                                              │  │
│ │ O  │ │  Main Content Area                           │  │
│ │ J  │ │  (List view OR Board view)                   │  │
│ │ E  │ │                                              │  │
│ │ C  │ │                                              │  │
│ │ T  │ │                                              │  │
│ │    │ │                                              │  │
│ │ R  │ │                                              │  │
│ │ A  │ │                                              │  │
│ │ I  │ │                                              │  │
│ │ L  │ │                                              │  │
│ └────┘ └──────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────┤
│ │ Command palette (Cmd+K)                               │
│ └────────────────────────────────────────────────────────┘
```

### Project Rail (Discord-style, left edge)

Narrow vertical strip (48-56px wide). Each project is a rounded square icon with the project's first letter or a small icon. Active project has a blue left-border indicator (like Discord's active server pill).

```
┌──────┐
│  T   │  ← Trek (active, blue pill indicator)
│  B   │  ← Bhaktiram
│  R   │  ← TotalRecall
│  P   │  ← Pi
│      │
│  +   │  ← Add project
│──────│
│  ⚙   │  ← Settings (bottom)
└──────┘
```

- Hover: tooltip with full project name
- Click: switches project context, loads that project's tickets
- Keyboard: `1-9` to jump to project by position
- Bottom: settings gear icon

### Header Bar

Sits above the main content, right of the project rail. Contains:

```
┌─────────────────────────────────────────────────────────────────┐
│ [List] [Board]  │  Filter: [Status v] [Priority v] [Tags v]  │ [⌘K] │
└─────────────────────────────────────────────────────────────────┘
```

- **View toggle:** List / Board — two buttons, active one is highlighted
- **Filters:** Dropdown pills for status, priority, tags. Active filters show as removable chips
- **Search:** Small search icon that expands into input, or just use Cmd+K
- **Ticket count:** Subtle "75 tickets" label

### Main Content: List View (default)

GitHub Issues-style table. This is the overview view.

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☐  t-f565  CRITICAL: SpacetimeDB deadlocks under no...  ● Urgent  │
│            spacetimedb, critical                          Open      │
│─────────────────────────────────────────────────────────────────────│
│ ☐  t-1e87  Ship movement jitter/micro-jumping — kin...   ● High    │
│            physics, rendering                             Open      │
│─────────────────────────────────────────────────────────────────────│
│ ☐  t-de53  NPC combat coherence + test framework         ● Urgent  │
│            npc, combat, testing                           In Prog   │
└─────────────────────────────────────────────────────────────────────┘
```

Each row shows:
- **Checkbox** (hidden until hover or selection mode active)
- **Ticket ID** in mono font, muted
- **Title** — truncated with ellipsis, full title on hover
- **Tags** — small pills below title, muted colors
- **Priority** — colored dot + label
- **Status** — colored dot + label
- **Created date** — relative ("3d ago"), far right, muted

Click a row → navigates to **ticket detail view** (full page, not a panel).

### Main Content: Board View (kanban)

Columns by status. Cards inside columns.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Open (41)    │ │ In Progress  │ │ Closed (203) │ │ Cancelled(5) │
│              │ │ (12)         │ │              │ │              │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │ │              │
│ │ t-f565   │ │ │ │ t-de53   │ │ │ │ t-9cdc   │ │ │              │
│ │ CRITICAL │ │ │ │ NPC com  │ │ │ │ Project  │ │ │              │
│ │ ● Urgent │ │ │ │ ● Urgent │ │ │ │ assess   │ │ │              │
│ │ stdb,cri │ │ │ │ npc,test │ │ │ │          │ │ │              │
│ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │ │              │
│ ┌──────────┐ │ │              │ │              │ │              │
│ │ t-1e87   │ │ │              │ │              │ │              │
│ │ Ship jit │ │ │              │ │              │ │              │
│ └──────────┘ │ │              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

Each card:
- Ticket ID (mono, muted)
- Title (2 lines max, truncated)
- Priority dot
- Tag pills (max 3 visible, "+N" overflow)
- No avatars (single user)

Drag a card between columns → PATCH to server → runs `tk start/close/reopen`.

Columns can be collapsed (click column header). Hidden columns show as a narrow strip at the end (like Linear).

### Ticket Detail View (full page)

Click a ticket from list or board → full page replaces the main content area. Back button (or `Esc`) returns to previous view.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to list          t-f565          [Edit] [Close] [Delete]   │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│  CRITICAL: SpacetimeDB deadlocks under normal operation             │
│                                                                     │
│  Status: ● Open    Priority: ● Urgent    Type: bug                 │
│  Tags: spacetimedb, critical, server                                │
│  Created: 2026-02-20    Deps: t-d872                               │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ## Goal                                                            │
│  Identify and fix the root cause of SpacetimeDB deadlocks          │
│  that occur during normal multiplayer operation...                   │
│                                                                     │
│  ## Acceptance Criteria                                              │
│  - [ ] Root cause identified                                        │
│  - [ ] Fix implemented                                              │
│  - [ ] No deadlocks in 1hr stress test                             │
│                                                                     │
│  ## Verification                                                    │
│  - [ ] bun run test:st passes                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- Full rendered markdown body
- Metadata bar at top (status, priority, type, tags, dates, deps)
- Action buttons: Edit (opens in editor?), Close/Reopen, Delete
- Deps shown as clickable links to other tickets
- Checkboxes in markdown are interactive (toggle → writes back to file)

## Multi-Selection

Follows Linear's model exactly:

| Input | Behavior |
|-------|----------|
| Click row | Navigate to ticket detail |
| `X` | Toggle selection on highlighted/focused row |
| `Shift + Click` | Range select from last selected to clicked |
| `Shift + Up/Down` | Extend selection by one |
| `Cmd/Ctrl + A` | Select all visible (filtered) tickets |
| `Escape` | Clear all selections |
| Checkbox click | Toggle selection (checkbox visible on hover at left edge) |

When 2+ tickets are selected, a **bulk action bar** appears at the bottom:

```
┌─────────────────────────────────────────────────────────────────┐
│  3 selected    [Status ▾]  [Priority ▾]  [Tags ▾]  [Close All] │
└─────────────────────────────────────────────────────────────────┘
```

Bulk actions call the server which runs `tk` commands for each ticket.

Works in both List and Board views.

## Vim Bindings

All bindings active when no input is focused. No mode switching (no insert mode) — this is navigation-only vim, not a text editor.

### Navigation

| Key | Action |
|-----|--------|
| `j` / `k` | Move highlight down/up |
| `g g` | Jump to first ticket |
| `G` | Jump to last ticket |
| `Ctrl+d` / `Ctrl+u` | Half-page down/up |
| `H` / `L` | Previous/next project (on project rail) |
| `1`-`9` | Jump to project by position |
| `/` | Focus search (same as Cmd+K) |
| `Enter` | Open highlighted ticket detail |
| `Escape` | Back / clear selection / close detail |

### Actions

| Key | Action |
|-----|--------|
| `x` | Toggle selection on highlighted ticket |
| `X` (shift+x) | Select range from anchor to current |
| `o` | Set status → Open |
| `i` | Set status → In Progress |
| `c` | Set status → Closed |
| `p` | Cycle priority (urgent → high → medium → low) |
| `v` | Toggle between List and Board view |
| `?` | Show keyboard shortcut overlay |

### Command Palette (Cmd+K)

Quick fuzzy search across all tickets in current project. Shows ticket ID + title. Enter to navigate. Supports actions:

- `>close t-f565` — close a ticket
- `>start t-f565` — start a ticket
- `>tag t-f565 critical` — add tag
- Type to filter tickets by title/ID/tag

## API Design

All endpoints under `/api/`. Server reads/writes `.tickets/` dirs directly.

### Endpoints

```
GET  /api/projects                    → List configured projects
GET  /api/projects/:id/tickets        → All tickets for a project
GET  /api/projects/:id/tickets/:tid   → Single ticket with full body
PATCH /api/projects/:id/tickets/:tid  → Update ticket (status, priority, tags)
POST /api/projects/:id/tickets/:tid/checkbox → Toggle a markdown checkbox
```

### Ticket Response Shape

```typescript
interface Ticket {
  id: string
  status: 'open' | 'in_progress' | 'closed' | 'cancelled'
  type: string
  priority: number          // 0=urgent, 1=high, 2=medium, 3=low
  tags: string[]
  deps: string[]
  links: string[]
  created: string           // ISO date
  title: string
  body: string              // raw markdown
  project: string           // project ID
}
```

### Write Operations

PATCH body:
```json
{
  "status": "closed",
  "priority": 1,
  "tags": ["combat", "npc"]
}
```

Server writes back to the `.tickets/*.md` file — updates YAML frontmatter directly. For status changes, also runs `tk close/start/reopen` to keep tk's index in sync.

## Configuration

`ramboard.config.ts` at project root:

```typescript
export default {
  projects: [
    { id: 'project-a',   name: 'Project A',   path: '~/Projects/project-a' },
    { id: 'project-b',   name: 'Project B',   path: '~/Projects/project-b' },
    { id: 'project-c',   name: 'Project C',   path: '~/Projects/project-c' },
  ],
  server: {
    port: 4000,
  },
}
```

No database. No cache. Reads from disk every request (tickets are small text files, disk reads are < 1ms). Can add in-memory cache with fswatch invalidation later if needed.

## File Structure

```
ramboard/
├── docs/
│   └── DESIGN-SPEC.md           # This file
├── server/
│   ├── index.ts                  # Bun.serve() entry point
│   ├── routes.ts                 # API route handlers
│   ├── ticket-parser.ts          # YAML frontmatter + markdown parsing
│   └── ticket-writer.ts          # Write back to .tickets/ files
├── src/
│   ├── main.tsx                  # React entry point
│   ├── app.tsx                   # App shell — project rail + header + content
│   ├── stores/
│   │   ├── project-store.ts      # Active project, project list
│   │   ├── ticket-store.ts       # Tickets, filters, selection state
│   │   └── ui-store.ts           # View mode, command palette, keyboard state
│   ├── components/
│   │   ├── project-rail.tsx      # Discord-style left sidebar
│   │   ├── header-bar.tsx        # View toggle, filters, search
│   │   ├── list-view.tsx         # GitHub Issues-style table
│   │   ├── board-view.tsx        # Kanban columns
│   │   ├── board-column.tsx      # Single kanban column
│   │   ├── board-card.tsx        # Card in kanban column
│   │   ├── ticket-row.tsx        # Row in list view
│   │   ├── ticket-detail.tsx     # Full ticket page
│   │   ├── bulk-action-bar.tsx   # Bottom bar for multi-select actions
│   │   ├── command-palette.tsx   # Cmd+K fuzzy search overlay
│   │   ├── tag-pill.tsx          # Tag display component
│   │   ├── status-dot.tsx        # Colored status indicator
│   │   ├── priority-icon.tsx     # Priority indicator
│   │   └── keyboard-help.tsx     # ? shortcut overlay
│   ├── hooks/
│   │   └── use-keyboard.ts       # Vim binding + shortcut handler
│   ├── lib/
│   │   ├── api.ts                # Fetch helpers
│   │   └── keybindings.ts        # Keymap definition (data, not hooks)
│   └── styles/
│       └── globals.css           # Tailwind imports + Geist font face
├── index.html                    # Vite entry HTML
├── ramboard.config.ts            # Project paths config
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── AGENTS.md
```

## Implementation Priority

### P0 — Core (must have for first usable version)
1. Server: ticket parser + API endpoints
2. Project rail with project switching
3. List view with sorting
4. Ticket detail view with markdown rendering
5. Board view with drag-and-drop status changes
6. Basic keyboard navigation (j/k, Enter, Esc)

### P1 — Selection & Actions
7. Multi-selection (x, shift+click, cmd+a)
8. Bulk action bar
9. Status/priority changes from both views
10. Vim bindings (full set)

### P2 — Polish
11. Command palette (Cmd+K)
12. Filters (status, priority, tags)
13. Tag management
14. Checkbox toggling in markdown
15. Keyboard shortcut help overlay (?)

### P3 — Nice to have
16. File watcher for live reload when tickets change on disk
17. Cross-project search
18. Dependency graph visualization
19. Ticket creation from UI
