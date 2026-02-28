---
id: r-49cb
status: in_progress
deps: []
links: []
created: 2026-02-28T10:34:03Z
type: epic
priority: 1
assignee: Alexander Mangel
tags: [plan, ui, ticket-detail]
---
# Ticket detail page: interactive editing & context menu

Rework the ticket detail view to be fully interactive like Linear. Four areas of work: right-click context menu, inline metadata selectors, tag management, and TipTap rich text body editing.



## Goal
Transform the ticket detail page from read-only display to a fully interactive editing surface. Status/priority/type become click-to-change selectors, tags become manageable (add/remove), body becomes an inline TipTap markdown editor, and the whole page gets a right-click context menu.

## Acceptance Criteria
- [ ] Right-click anywhere on ticket detail opens context menu with status/priority/copy actions (reuse existing MenuContent from ticket-context-menu.tsx)
- [ ] Status dot/label is clickable → opens Base UI Select with status options (open/in_progress/closed/cancelled), updates immediately via API
- [ ] Priority icon/label is clickable → opens Base UI Select with priority options (urgent/high/medium/low), updates immediately via API
- [ ] Type badge is clickable → opens Base UI Select with type options (task/bug/feature/epic/chore), updates immediately via API
- [ ] Each tag pill has an X button to remove it (calls API with updated tags array)
- [ ] A + button after tags opens a Base UI Popover with search input: filters existing tags from all tickets, typing a non-existing tag and pressing Enter creates it
- [ ] Clicking the body area activates TipTap editor with current markdown content
- [ ] TipTap supports: bold, italic, strikethrough, inline code, headings H1-H3, bullet/numbered/task lists, blockquotes, code blocks, links, tables, horizontal rules, slash commands
- [ ] Editor has floating toolbar on text selection (bold/italic/strike/code/link)
- [ ] Slash command menu for block-level formatting (headings, lists, code block, table, divider)
- [ ] Saving (Cmd+S or blur/click-away) serializes TipTap content back to markdown and PATCHes the API
- [ ] Server ticket-writer.ts supports body updates (writes markdown back to .md file body section)
- [ ] All selectors/popovers use Base UI primitives, styled with Tailwind + data-[state] attributes

## Verification
- [ ] Right-click on ticket detail shows context menu with working status/priority actions
- [ ] Click status → dropdown appears → select new status → UI updates + server file changes
- [ ] Click priority → dropdown appears → select new priority → UI updates + server file changes
- [ ] Click type → dropdown appears → select new type → UI updates + server file changes
- [ ] Click X on tag → tag removed from UI + server file
- [ ] Click + on tags → popover with search → type existing tag name → select → tag added
- [ ] Click + on tags → type new tag name → press Enter → new tag created and added
- [ ] Click body → TipTap editor activates with correct content
- [ ] Type markdown shortcuts (** for bold, # for heading, etc.) → converts to rich text
- [ ] Type / → slash command menu appears with formatting options
- [ ] Select text → floating toolbar appears
- [ ] Cmd+S or click away → content saved as markdown to server
- [ ] Verify .tickets/*.md file has correct markdown after body edit

## Worktree
- .
