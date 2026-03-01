---
id: r-db91
status: closed
deps: []
links: [r-9f99]
created: 2026-03-01T12:24:55Z
type: feature
priority: 2
assignee: Alexander Mangel
tags: [frontend, routing, ux]
---
# Clean URL structure: /<project>/view/<viewId> instead of encoded JSON params

Current URLs look like:\n`/trek?f=%5B%7B%22id%22%3A%22default-status%22%2C%22field%22%3A%22status%22...%5D&sf=created`\n\nShould be:\n- `/<project-id>` — default view\n- `/<project-id>/view/<viewId>` — specific saved view\n- `/<project-id>/ticket/<ticketId>` — ticket detail (already works)\n\nFilters and sort are persisted in the SavedView on the server. No need to serialize them into the URL. The URL just identifies WHICH view is active.\n\nThe `use-filter-url-sync.ts` hook currently serializes/deserializes filter state to/from URL params. This should be replaced with view-based routing. When you switch views, the URL changes to `/project/view/viewId`. When you load that URL, it loads the view's saved filters.\n\nThe view-based routing partially exists already (`/:projectId/view/:viewId` route in app.tsx), but the filter-url-sync hook fights it by writing filter JSON to query params.\n\nRelated: `use-filter-url-sync.ts`, `app.tsx` routes, `use-project-view-setup.ts` (already has viewId sync logic).



## Goal
URLs are clean and human-readable. Filter state lives in saved views, not URL params.

## Acceptance Criteria
- [ ] URLs follow /<project>/view/<viewId> pattern
- [ ] No JSON-encoded filter params in URL
- [ ] Loading a view URL restores its saved filters correctly
- [ ] use-filter-url-sync.ts removed or replaced with view-based sync
- [ ] Back/forward browser navigation works between views

## Verification
- [ ] TODO

## Worktree
- .
