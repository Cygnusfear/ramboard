---
id: r-9afb
status: closed
deps: []
links: []
created: 2026-02-23T05:52:13Z
type: feature
priority: 1
assignee: Alexander Mangel
tags: [feature, frontend, ux]
---
# List view — Linear-quality UX: drag-select, smooth interactions, polish

Rewrite list view to match Linear's feel: drag-to-select rows, shift+click range, cmd+click toggle, smooth hover states, keyboard focus, staggered entrance animations, compact density, inline status changes.



## Goal
Rewrite list view to match Linear's feel: drag-to-select rows, shift+click range, cmd+click toggle, smooth hover states, keyboard focus, staggered entrance animations, compact density, inline status changes.

## Acceptance Criteria
- [ ] Drag-to-select: mousedown on row + drag up/down selects range
- [ ] Shift+click: range select from anchor to clicked row
- [ ] Cmd/Ctrl+click: toggle individual row selection
- [ ] Checkbox appears on hover (hidden otherwise unless selected)
- [ ] Keyboard j/k shows visible focus highlight
- [ ] Smooth row entrance animation (staggered)
- [ ] Compact row density matching Linear
- [ ] Selection count shown when items selected
- [ ] Inline status cycling on click
- [ ] Smooth transitions on all interactions

## Verification
- [ ] Visual: rows animate in on load
- [ ] Interaction: drag from row 3 to row 8 selects 3-8
- [ ] Interaction: shift+click extends selection
- [ ] Interaction: cmd+click toggles single row
- [ ] Keyboard: j/k moves highlight visually

## Worktree
- .
