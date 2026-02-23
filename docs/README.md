# Ramboard

<img width="3676" height="2378" alt="Screenshot 2026-02-23 at 10 47 33" src="https://github.com/user-attachments/assets/89509b3d-6b7f-4c66-9355-d63ceb2939a5" />
<img width="3676" height="2378" alt="Screenshot 2026-02-23 at 10 47 30" src="https://github.com/user-attachments/assets/571d634e-b70f-4a0a-b70c-acb4b179cb67" />

Multi-project ticket board used with agent `tk` usage. Reads `.tickets/` directories from local repos and presents them as a Linear-style kanban + list interface. Read-write. No database, no sync — the filesystem is the source of truth.

## Feature Areas

| ID | Area | Status | Description |
|----|------|--------|-------------|
| 01 | [[features/01-core-server/README\|Core Server]] | Planned | Bun HTTP server, ticket parser, API routes |
| 02 | [[features/02-project-navigation/README\|Project Navigation]] | Planned | Discord-style project rail, switching, config |
| 03 | [[features/03-list-view/README\|List View]] | Planned | GitHub Issues-style table, sorting, filtering |
| 04 | [[features/04-board-view/README\|Board View]] | Planned | Kanban columns, drag-and-drop, column collapse |
| 05 | [[features/05-ticket-detail/README\|Ticket Detail]] | Planned | Full-page ticket view, markdown rendering, actions |
| 06 | [[features/06-selection-and-actions/README\|Selection & Actions]] | Planned | Multi-select, bulk actions, status/priority changes |
| 07 | [[features/07-keyboard-and-vim/README\|Keyboard & Vim]] | Planned | Vim navigation, shortcuts, command palette |
| 08 | [[features/08-visual-design/README\|Visual Design]] | Planned | Theming, typography, animation, taste |

## Architecture

```
ramboard/
├── server/        # Bun API server — reads/writes .tickets/ dirs
├── src/           # React SPA — board, list, detail views
├── docs/          # This wiki
└── ramboard.config.ts  # Project path configuration
```

## Quick Links

- [[DESIGN-SPEC|Full Design Spec]]
- [[reference/README|Reference & Decisions]]
- [[playbook/README|Playbook]]
