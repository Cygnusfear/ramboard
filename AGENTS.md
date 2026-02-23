# AGENTS.md — Ramboard

Multi-project ticket board. Reads `.tickets/` from local repos. Linear-style UI.

## Stack

- **Runtime:** Bun
- **Server:** `Bun.serve()` — no frameworks
- **Frontend:** React 19 + Vite + Tailwind v4
- **Animation:** CSS first, anime.js fallback for spring/orchestration
- **DnD:** @dnd-kit
- **Icons:** @phosphor-icons/react (no emoji)
- **Fonts:** Geist + Geist Mono
- **State:** Zustand

## Structure

```
server/           # Bun API — ticket parser, routes, writer
src/              # React SPA — views, stores, components
docs/             # Obsidian wiki — specs, plans, playbook
```

## Rules

- No sliding panels or drawers. Ticket detail is full-page.
- No framer-motion. CSS transitions + anime.js only.
- No emoji in UI. Phosphor icons everywhere.
- No Inter font. No purple. No pure black/white.
- Dark theme only. Zinc-950 base, Blue-500 accent.
- Vim bindings active when no input focused.

## Docs

- Design spec: `docs/DESIGN-SPEC.md`
- Feature specs: `docs/features/NN-area/NN.NN-*-spec.md`
- Wiki index: `docs/README.md`

## Tools

- `bun` for everything (not npm/yarn/pnpm)
- `tk` for ticket management
- `tinychange` for changelog
