---
id: r-41fc
status: closed
deps: []
links: []
created: 2026-02-23T07:06:08Z
type: task
priority: 1
assignee: Alexander Mangel
tags: [feature, frontend, base-ui]
---
# Migrate interactive elements to Base UI components

Replace hand-rolled buttons, selects, checkboxes, toggles, popovers, and inputs with @base-ui/react headless components. Keep existing Tailwind styles.



## Goal
Replace hand-rolled buttons, selects, checkboxes, toggles, popovers, and inputs with @base-ui/react headless components. Keep existing Tailwind styles.

## Acceptance Criteria
- [ ] All filter dropdowns use Base UI Select/Popover
- [ ] View mode toggle uses Base UI Toggle/ToggleGroup
- [ ] Checkboxes in filter multi-select use Base UI Checkbox
- [ ] Filter bar add-filter uses Base UI Popover
- [ ] Command palette uses Base UI Dialog
- [ ] All interactive elements accessible (keyboard, ARIA)

## Verification
- [ ] Tab through all interactive elements
- [ ] Filter dropdowns open/close correctly
- [ ] Keyboard navigation works in dropdowns

## Worktree
- .
