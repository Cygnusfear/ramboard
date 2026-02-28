# Ticket Detail Interactive Editing — Implementation Plan

Parent: r-49cb

## Phase 1: Server — body updates
**Files:** `server/ticket-writer.ts`, `src/lib/api.ts`, `src/stores/ticket-store.ts`

1. Add `body?: string` to `TicketUpdate` interface in `ticket-writer.ts`
2. In `updateTicketFile`, when `update.body !== undefined`, replace the body section (everything after `---\n`) with the new markdown
3. Add `type?: string` to `TicketUpdate` — so type changes work too
4. Add `updateTicketType` to the ticket store (mirrors `updateTicketPriority` pattern)
5. Add `updateTicketBody` to the ticket store
6. Add `updateTicketTags` to the ticket store

## Phase 2: Inline metadata selectors
**Files:** `src/components/ticket-detail.tsx`, new `src/components/inline-select.tsx`

1. Create `InlineSelect` — a generic Base UI Popover that:
   - Renders a trigger (the current value display)
   - Opens a list of options on click
   - Highlights current value
   - Calls `onSelect(value)` on pick
   - Closes on selection or Escape
2. Wrap StatusDot in InlineSelect with status options (reuse `statusOptions` from context menu — extract to shared `src/lib/ticket-options.tsx`)
3. Wrap PriorityIcon in InlineSelect with priority options
4. Wrap type badge in InlineSelect with type options (task/bug/feature/epic/chore)
5. Wire each to the appropriate store action

## Phase 3: Tag management
**Files:** `src/components/ticket-detail.tsx`, new `src/components/tag-editor.tsx`

1. Create `TagEditor` component:
   - Renders existing tags as `TagPill` with an X (close) button overlay
   - Clicking X removes the tag → calls `updateTicketTags` with filtered array
   - A `+` button at the end opens a Base UI Popover
2. Tag popover internals:
   - Text input with autofocus
   - Filters known tags (collected from all tickets in current project) as you type
   - Shows matching tags as selectable items
   - If typed value doesn't match any existing tag, show "Create '{value}'" option
   - Selecting a tag adds it and closes popover
   - Enter on "Create" creates and adds the new tag

## Phase 4: TipTap editor
**Packages:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-typography`

**Files:** new `src/components/ticket-body-editor.tsx`, new `src/components/editor-toolbar.tsx`, new `src/components/slash-command.tsx`

1. Install TipTap packages via bun
2. Create `TicketBodyEditor` component:
   - **Read mode:** renders markdown via react-markdown (current behavior)
   - **Edit mode:** TipTap editor initialized with markdown→HTML conversion
   - Click on body → switch to edit mode
   - Cmd+S → serialize to markdown → PATCH API → switch back to read mode
   - Click outside editor → auto-save (debounced)
3. Markdown round-trip:
   - On edit start: convert stored markdown → TipTap HTML (use a markdown-to-html lib or TipTap's `generateHTML` from markdown extensions)
   - On save: serialize TipTap content → markdown (use turndown or similar)
   - Validate round-trip preserves content
4. Floating toolbar (`EditorToolbar`):
   - Shows on text selection via TipTap's `BubbleMenu`
   - Buttons: bold, italic, strikethrough, code, link
   - Styled with Tailwind, same zinc/dark theme
5. Slash commands (`SlashCommand`):
   - TipTap extension that triggers on `/` character
   - Shows a filtered list of block types: H1, H2, H3, bullet list, numbered list, task list, blockquote, code block, table, divider
   - Uses Base UI Popover for the command palette
   - Selection inserts the block type

## Phase 5: Right-click context menu
**Files:** `src/components/ticket-detail.tsx`, `src/components/ticket-context-menu.tsx`

1. Wrap the ticket detail page content in a `ContextMenu.Root` from Base UI
2. Reuse `MenuContent` from `ticket-context-menu.tsx` — it already supports status/priority submenus
3. Add detail-page-specific items: "Copy ID", "Copy as Markdown"
4. Wire actions to the store (single ticket = `activeTicket`)

## Shared extraction (do first)
- Extract `statusOptions` and `priorityOptions` from `ticket-context-menu.tsx` into `src/lib/ticket-options.tsx`
- Add `typeOptions` there too
- Both the context menu and inline selectors import from the same source

## Ordering
1. Shared extraction (ticket-options)
2. Phase 1 (server body/type updates)
3. Phase 2 (inline selectors)
4. Phase 3 (tag management)
5. Phase 5 (context menu — quick, reuses existing)
6. Phase 4 (TipTap — biggest piece, last)
