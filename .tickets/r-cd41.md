---
id: r-cd41
status: closed
deps: []
links: [r-c945]
created: 2026-02-28T00:08:00Z
type: task
priority: 3
tags: [mid-mortem, compaction]
---
# Mid-mortem: Tags crash fix, ticket linkification, graph view, project rail DnD

Session covering tags crash, click-to-copy IDs, ticket ID auto-linkification, dependency graph view, and project rail context menu + drag reorder.

Continues from previous mid-mortem `r-c945`.

---

## What Was Being Worked On

**Ramboard** — multi-project ticket dashboard. This session focused on 5 distinct features/fixes, all driven by the user testing with real ticket data from the `trek` project's `restore-spacetime-v2` worktree (~180+ tickets with varied frontmatter quality).

### Goals
1. Fix crash when loading boards with non-standard YAML frontmatter
2. Make ticket IDs click-to-copy everywhere
3. Auto-link ticket IDs in markdown body text + show dependency/link activity timeline
4. Add a graph view (madge-style DAG) as a third view mode alongside List and Board
5. Project rail: right-click context menu (remove) + drag-to-reorder

---

## Decisions Made

### 1. Tags/deps/links YAML normalization (root cause fix)

**Problem:** YAML `tags: plan, t-4237, architecture` (no brackets) parses as a **string**, not an array. The old code `meta.tags || []` didn't catch this because the string is truthy. This made `t.tags.forEach()` blow up in `FilterEditor`.

**Fix:** Added `normalizeList()` in `server/ticket-parser.ts` — handles null, string (comma-separated), and array cases. Applied to `tags`, `deps`, and `links`. Belt-and-suspenders defensive coding added client-side in `filter-engine.ts` and `routes.ts`.

### 2. Click-to-copy ticket IDs

Created reusable `src/components/copyable-id.tsx` — shows ticket ID with Phosphor `Copy` icon on hover, flashes green checkmark for 1.5s after clipboard write. Used in ticket detail header bar and above the body title.

### 3. Ticket ID linkification — shared architecture

**Decision:** Broad regex match (`[a-z0-9]{1,5}-[a-z0-9]{3,5}`) → validate against actual known ticket IDs from the store → only link confirmed tickets. No false positives.

**Architecture (single code path, no duplication):**
```
src/lib/linkify-ticket-ids.tsx       — Pure function: text + Set<string> → React nodes
src/hooks/use-known-ticket-ids.ts    — Hook: returns Set<string> from ticket store
src/hooks/use-linkified-markdown.tsx  — Hook: returns ReactMarkdown Components with auto-linking
src/components/linkified-text.tsx     — Component: drop-in for plain text (titles)
src/components/ticket-link.tsx        — Component: clickable ticket ID → navigates to detail
```

Wired into: `ticket-detail.tsx` (markdown body), `list-view.tsx`, `board-column.tsx`, `command-palette.tsx` (all titles).

### 4. Activity timeline (Linear-style)

`src/components/ticket-activity.tsx` — shows chronological activity:
- Creation event
- Forward deps/links (this ticket depends on / links to X)
- **Reverse** deps/links (other tickets that depend on / link to this ticket)
- All ticket IDs are clickable `<TicketLink>` components

Reverse relationships also shown in the metadata header area ("Depended on by:", "Referenced by:").

### 5. Graph view with dagre

**Decision:** Use `@dagrejs/dagre` (already graphviz-style hierarchical layout) for the DAG, render as pure SVG (no canvas, no D3). This keeps it lightweight and CSS-styled.

**Features:**
- Left-to-right hierarchical layout
- Nodes: rounded rects with `<id> <title truncated to 80 chars>`
- Border color by status (zinc=open, blue=in_progress, green=closed, red=cancelled)
- Solid edges = deps, dashed edges = links
- Pan (click-drag) + zoom (scroll toward cursor) + auto-fit on load
- Hover tooltip with full metadata
- Click navigates to ticket detail
- Respects filters via `useFilteredTickets()`
- Legend in bottom-right corner

**Type changes:** `ViewMode` expanded from `'list' | 'board'` to `'list' | 'board' | 'graph'`. `SavedView.mode` uses `ViewMode` type.

### 6. Project rail: context menu + drag reorder

**Server:** Added `reorderProjects(ids)` in `server/config.ts` + `PUT /api/projects/reorder` endpoint.

**Client:** Base UI `ContextMenu` (not plain `Menu`) for right-click. `@dnd-kit/sortable` with 5px activation distance so clicks still work.

**Navigation fix:** After deleting a project, the rail now navigates to the next remaining project (or `/` if none left). Without this, the URL stayed on the deleted project ID.

---

## Progress

### ✅ Done
- [x] Fix tags crash — `normalizeList()` in ticket parser for tags/deps/links
- [x] Defensive client-side guards in filter-engine, routes, view components
- [x] `CopyableId` component — click-to-copy with visual feedback
- [x] Ticket ID auto-linkification — shared architecture, wired into 4 components
- [x] `TicketLink` component — clickable navigable ticket IDs
- [x] `TicketActivity` timeline — Linear-style, forward + reverse relationships
- [x] Reverse deps/links in metadata header
- [x] Markdown heading linkification (h1–h6)
- [x] Graph view — dagre layout, SVG rendering, pan/zoom, tooltips, click-to-navigate
- [x] Graph toggle in header bar (List | Board | Graph)
- [x] Filter bar visible for graph mode
- [x] Project rail context menu (Base UI ContextMenu, right-click)
- [x] Project rail drag-to-reorder (@dnd-kit/sortable)
- [x] Server endpoint for project reorder
- [x] Delete project + navigate to next project
- [x] `@dagrejs/dagre` dependency added

### 🟡 Not Verified Visually by User
- [ ] Graph view — built but user only said "very pretty yes" (likely saw it but no bug reports yet)
- [ ] Drag reorder on rail — built, not explicitly confirmed working
- [ ] Delete project navigation fix — built, user said "ok but the remove must also work / refresh the bar / whatever", fix was applied but not re-tested

---

## Open Threads

1. **No commits made this session** — All changes are unstaged working tree modifications. A future agent should commit these changes in logical groups.

2. **Filter bar for graph/board** — Filter bar now shows for graph mode (changed from list-only), but board mode still doesn't show it. May want consistency.

3. **Graph view performance** — Untested with large ticket sets (trek has 180+ tickets). Dagre layout + SVG rendering may need optimization for 500+ nodes.

4. **Graph view mode persistence** — When switching to graph mode, if no saved view with `mode: 'graph'` exists, the code does a local-only mode update on the current view (not persisted to server). Creating a proper "Graph" view on first switch may be better UX.

5. **Dev server running** — Background job `bg-1476f2ab`: API on `:4000`, Vite on `:4002` (4001 was in use).

---

## Gotchas & Learnings

1. **YAML string vs array** — `tags: foo, bar` (no brackets) parses as a single string in YAML. Always normalize with a helper that handles both string and array. The `||` fallback doesn't work because strings are truthy.

2. **`normalizeList` applied to deps/links too** — Same YAML issue affects deps and links, not just tags. Always normalize all list-type frontmatter fields.

3. **Base UI ContextMenu vs Menu** — Base UI has a dedicated `ContextMenu` component for right-click menus. Don't use plain `Menu` with manual `onContextMenu` — `ContextMenu.Trigger` + `ContextMenu.Root` handles it natively.

4. **`@dagrejs/dagre` v2 API** — Import from `@dagrejs/dagre`, the `dagre` package is the old v1. v2 has ESM support. API: `new dagre.graphlib.Graph()`, `dagre.layout(g)`.

5. **dnd-kit activation distance** — Set `activationConstraint: { distance: 5 }` on `PointerSensor` so that clicks don't accidentally trigger drags. Critical for interactive elements inside draggable containers.

6. **JSX in .ts files** — The `use-linkified-markdown.ts` file initially had JSX and failed to compile. Renamed to `.tsx`. Always use `.tsx` if the file contains any JSX.

7. **Linkifying strategy** — Broad regex + validation against known IDs is better than tight regex. Ticket ID formats vary wildly across projects (`a-37f0`, `30ca-0b30`, `nms-1234`). Cast the net wide, then filter.

8. **Delete project + navigation** — Removing a project from the store isn't enough — the URL still points to the deleted project. Must explicitly navigate away after deletion.

---

## Files Changed This Session

### New Files
| File | Purpose |
|---|---|
| `src/components/copyable-id.tsx` | Click-to-copy ticket ID with visual feedback |
| `src/components/ticket-link.tsx` | Clickable navigable ticket ID link |
| `src/components/ticket-activity.tsx` | Linear-style activity timeline (forward + reverse relationships) |
| `src/components/linkified-text.tsx` | Drop-in component for linkifying plain text |
| `src/components/graph-view.tsx` | Full DAG graph view with dagre, SVG, pan/zoom |
| `src/lib/linkify-ticket-ids.tsx` | Pure linkification function (regex + known ID validation) |
| `src/hooks/use-known-ticket-ids.ts` | Hook returning Set of known ticket IDs |
| `src/hooks/use-linkified-markdown.tsx` | Hook returning ReactMarkdown Components with auto-linking |

### Modified Files
| File | Changes |
|---|---|
| `server/ticket-parser.ts` | Added `normalizeList()`, applied to tags/deps/links |
| `server/routes.ts` | Tag filter guard, reorder endpoint |
| `server/config.ts` | Added `reorderProjects()` |
| `src/lib/filter-engine.ts` | Defensive `safeTags` + `Array.isArray` guards |
| `src/lib/types.ts` | `ViewMode` includes `'graph'`; `SavedView` graph config type |
| `src/lib/api.ts` | Added `deleteProject()`, `reorderProjects()` |
| `src/stores/project-store.ts` | Added `deleteProject`, `reorderProjects` actions |
| `src/components/ticket-detail.tsx` | CopyableId, TicketLink, TicketActivity, reverse relationships, markdown auto-linking |
| `src/components/list-view.tsx` | LinkifiedText for titles |
| `src/components/board-column.tsx` | LinkifiedText for titles, optional chaining on tags |
| `src/components/command-palette.tsx` | LinkifiedText for titles |
| `src/components/header-bar.tsx` | Graph toggle, Graph icon, filter bar for graph mode |
| `src/components/project-rail.tsx` | Full rewrite: Base UI ContextMenu + dnd-kit sortable |
| `src/app.tsx` | GraphView routing, ViewContent extraction |

### Dependencies Added
| Package | Purpose |
|---|---|
| `@dagrejs/dagre` | DAG layout engine for graph view |
| `@types/dagre` | TypeScript types |

---

## Architecture (current state)

```
~/.ramboard/config.json              — project list + order (source of truth)
server/config.ts                     — reads/writes config, reorderProjects()
server/ticket-parser.ts              — YAML normalization: normalizeList() for tags/deps/links
server/routes.ts                     — REST API incl. PUT /api/projects/reorder

src/lib/linkify-ticket-ids.tsx       — Pure: text + known IDs → React nodes
src/hooks/use-known-ticket-ids.ts    — Set<string> of all ticket IDs from store
src/hooks/use-linkified-markdown.tsx  — ReactMarkdown Components with linkifying
src/components/linkified-text.tsx     — Drop-in linkified text component
src/components/ticket-link.tsx        — Navigable ticket ID chip
src/components/ticket-activity.tsx    — Timeline: creation, deps, links, reverse refs
src/components/graph-view.tsx         — DAG view: dagre + SVG + pan/zoom
src/components/project-rail.tsx       — ContextMenu + dnd-kit sortable rail
```

**Ports:** API `:4000`, Vite `:4002` (4001 was occupied)

**Git:** No new commits this session — all changes in working tree.
