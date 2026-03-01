---
id: r-5aef
status: closed
deps: []
links: []
created: 2026-03-01T12:05:10Z
type: task
priority: 2
assignee: t2-api-deps
tags: [team]
---
# Working directory: /Users/alexander/Projects/ramboard/.worktrees/t2-api-deps

Read AGENTS.md first. Then read each file you modify BEFORE editing.

You have 3 tasks.

## T2-03: Fix `lib/linkify-ticket-ids.tsx` dependency inversion

`src/lib/linkify-ticket-ids.tsx` imports `@/components/ticket-link` — a lib/ module depending on the presentation layer. This violates 40.03 (dependency direction).

Consumers of `linkifyTicketIds`:
- `src/components/linkified-text.tsx` — calls it to render inline ticket links
- `src/hooks/use-linkified-markdown.tsx` — calls it to linkify markdown children

Consumers of `TICKET_ID_RE`:
- `src/components/ticket-link-plugin.ts` — uses the regex directly

### The fix — split into pure lib + presentation:

1. **Rewrite `src/lib/linkify-ticket-ids.ts`** (change .tsx → .ts, remove React):
   - Keep `TICKET_ID_RE` export (unchanged)
   - Replace `linkifyTicketIds` with a pure function that returns tokens:
   ```typescript
   export interface TicketIdToken {
     text: string
     isTicketId: boolean
   }
   
   export function tokenizeTicketIds(
     text: string,
     knownIds: Set<string>,
   ): TicketIdToken[] {
     if (knownIds.size === 0) return [{ text, isTicketId: false }]
     const tokens: TicketIdToken[] = []
     let lastIndex = 0
     TICKET_ID_RE.lastIndex = 0
     let match: RegExpExecArray | null
     while ((match = TICKET_ID_RE.exec(text)) !== null) {
       const candidate = match[1]
       if (!knownIds.has(candidate)) continue
       if (match.index > lastIndex) {
         tokens.push({ text: text.slice(lastIndex, match.index), isTicketId: false })
       }
       tokens.push({ text: candidate, isTicketId: true })
       lastIndex = match.index + match[0].length
     }
     if (lastIndex < text.length) {
       tokens.push({ text: text.slice(lastIndex), isTicketId: false })
     }
     return tokens.length === 0 ? [{ text, isTicketId: false }] : tokens
   }
   ```

2. **Update `src/components/linkified-text.tsx`**:
   - Import `tokenizeTicketIds` instead of `linkifyTicketIds`
   - Import `TicketLink` from `@/components/ticket-link`
   - Render tokens: strings stay as text, ticket IDs become `<TicketLink>`

3. **Update `src/hooks/use-linkified-markdown.tsx`**:
   - Import `tokenizeTicketIds` from `@/lib/linkify-ticket-ids`
   - Import `TicketLink` from `@/components/ticket-link`
   - Replace `linkifyTicketIds(children, knownIds)` with token-based rendering
   - Read the existing code carefully to understand how it walks React children

4. `ticket-link-plugin.ts` only imports `TICKET_ID_RE` — no change needed.

## T2-04: Add view API endpoints to `lib/api.ts`, update `view-store.ts`

`src/stores/view-store.ts` calls `fetch()` directly with no error handling, while all other stores use `lib/api.ts`'s `fetchJson` wrapper.

### What to do:
1. In `src/lib/api.ts`, add these functions:
   ```typescript
   export async function getViews(projectId: string): Promise<SavedView[]> {
     return fetchJson(`/projects/${projectId}/views`)
   }
   
   export async function saveViewApi(projectId: string, view: object): Promise<SavedView> {
     const isUpdate = 'id' in view
     const method = isUpdate ? 'PUT' : 'POST'
     const url = isUpdate
       ? `/projects/${projectId}/views/${(view as any).id}`
       : `/projects/${projectId}/views`
     return fetchJson(url, {
       method,
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(view),
     })
   }
   
   export async function deleteViewApi(projectId: string, viewId: string): Promise<void> {
     await fetchJson(`/projects/${projectId}/views/${viewId}`, { method: 'DELETE' })
   }
   ```
   Import `SavedView` from `@/lib/types`.

2. In `src/stores/view-store.ts`:
   - Import `{ getViews, saveViewApi, deleteViewApi }` from `@/lib/api`
   - Replace the 3 inline `fetch()` calls with the imported functions
   - This gives you error handling (`fetchJson` throws on non-OK status) and consistency

## T2-07: Delete dead `toggleCheckbox` from `api.ts`

`toggleCheckbox` is exported from `src/lib/api.ts` but never imported anywhere. Delete it.

After all 3:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t2-api-deps && npx tsc --noEmit 2>&1 | grep -v server/`
2. Commit: `git add -A && git commit -m 'refactor: fix linkify dep inversion, consolidate view API to lib/api.ts, delete dead toggleCheckbox'`
3. Report what you did with file-level detail.

Working directory: /Users/alexander/Projects/ramboard/.worktrees/t2-api-deps

Read AGENTS.md first. Then read each file you modify BEFORE editing.

You have 3 tasks.

## T2-03: Fix `lib/linkify-ticket-ids.tsx` dependency inversion

`src/lib/linkify-ticket-ids.tsx` imports `@/components/ticket-link` — a lib/ module depending on the presentation layer. This violates 40.03 (dependency direction).

Consumers of `linkifyTicketIds`:
- `src/components/linkified-text.tsx` — calls it to render inline ticket links
- `src/hooks/use-linkified-markdown.tsx` — calls it to linkify markdown children

Consumers of `TICKET_ID_RE`:
- `src/components/ticket-link-plugin.ts` — uses the regex directly

### The fix — split into pure lib + presentation:

1. **Rewrite `src/lib/linkify-ticket-ids.ts`** (change .tsx → .ts, remove React):
   - Keep `TICKET_ID_RE` export (unchanged)
   - Replace `linkifyTicketIds` with a pure function that returns tokens:
   ```typescript
   export interface TicketIdToken {
     text: string
     isTicketId: boolean
   }
   
   export function tokenizeTicketIds(
     text: string,
     knownIds: Set<string>,
   ): TicketIdToken[] {
     if (knownIds.size === 0) return [{ text, isTicketId: false }]
     const tokens: TicketIdToken[] = []
     let lastIndex = 0
     TICKET_ID_RE.lastIndex = 0
     let match: RegExpExecArray | null
     while ((match = TICKET_ID_RE.exec(text)) !== null) {
       const candidate = match[1]
       if (!knownIds.has(candidate)) continue
       if (match.index > lastIndex) {
         tokens.push({ text: text.slice(lastIndex, match.index), isTicketId: false })
       }
       tokens.push({ text: candidate, isTicketId: true })
       lastIndex = match.index + match[0].length
     }
     if (lastIndex < text.length) {
       tokens.push({ text: text.slice(lastIndex), isTicketId: false })
     }
     return tokens.length === 0 ? [{ text, isTicketId: false }] : tokens
   }
   ```

2. **Update `src/components/linkified-text.tsx`**:
   - Import `tokenizeTicketIds` instead of `linkifyTicketIds`
   - Import `TicketLink` from `@/components/ticket-link`
   - Render tokens: strings stay as text, ticket IDs become `<TicketLink>`

3. **Update `src/hooks/use-linkified-markdown.tsx`**:
   - Import `tokenizeTicketIds` from `@/lib/linkify-ticket-ids`
   - Import `TicketLink` from `@/components/ticket-link`
   - Replace `linkifyTicketIds(children, knownIds)` with token-based rendering
   - Read the existing code carefully to understand how it walks React children

4. `ticket-link-plugin.ts` only imports `TICKET_ID_RE` — no change needed.

## T2-04: Add view API endpoints to `lib/api.ts`, update `view-store.ts`

`src/stores/view-store.ts` calls `fetch()` directly with no error handling, while all other stores use `lib/api.ts`'s `fetchJson` wrapper.

### What to do:
1. In `src/lib/api.ts`, add these functions:
   ```typescript
   export async function getViews(projectId: string): Promise<SavedView[]> {
     return fetchJson(`/projects/${projectId}/views`)
   }
   
   export async function saveViewApi(projectId: string, view: object): Promise<SavedView> {
     const isUpdate = 'id' in view
     const method = isUpdate ? 'PUT' : 'POST'
     const url = isUpdate
       ? `/projects/${projectId}/views/${(view as any).id}`
       : `/projects/${projectId}/views`
     return fetchJson(url, {
       method,
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(view),
     })
   }
   
   export async function deleteViewApi(projectId: string, viewId: string): Promise<void> {
     await fetchJson(`/projects/${projectId}/views/${viewId}`, { method: 'DELETE' })
   }
   ```
   Import `SavedView` from `@/lib/types`.

2. In `src/stores/view-store.ts`:
   - Import `{ getViews, saveViewApi, deleteViewApi }` from `@/lib/api`
   - Replace the 3 inline `fetch()` calls with the imported functions
   - This gives you error handling (`fetchJson` throws on non-OK status) and consistency

## T2-07: Delete dead `toggleCheckbox` from `api.ts`

`toggleCheckbox` is exported from `src/lib/api.ts` but never imported anywhere. Delete it.

After all 3:
1. Verify: `cd /Users/alexander/Projects/ramboard/.worktrees/t2-api-deps && npx tsc --noEmit 2>&1 | grep -v server/`
2. Commit: `git add -A && git commit -m 'refactor: fix linkify dep inversion, consolidate view API to lib/api.ts, delete dead toggleCheckbox'`
3. Report what you did with file-level detail.


## Notes

**2026-03-01T12:05:34Z**

Starting work: read all files. Plan: T2-03 rewrite linkify-ticket-ids.tsx→.ts as pure tokenizer, update linkified-text.tsx and use-linkified-markdown.tsx; T2-04 add view API fns to api.ts + update view-store.ts; T2-07 delete toggleCheckbox from api.ts

**2026-03-01T12:06:56Z**

DONE: T2-03: Rewrote src/lib/linkify-ticket-ids.tsx→.ts as pure tokenizer (tokenizeTicketIds returns TicketIdToken[], no React/TicketLink imports). Updated src/components/linkified-text.tsx and src/hooks/use-linkified-markdown.tsx to import tokenizeTicketIds from lib and TicketLink from components — dep direction now correct. T2-04: Added getViews/saveViewApi/deleteViewApi to src/lib/api.ts (uses fetchJson for consistent error handling). Updated src/stores/view-store.ts to import and use those instead of raw fetch() calls. T2-07: Deleted dead toggleCheckbox from src/lib/api.ts. TypeScript clean. Committed as 6690d44.
