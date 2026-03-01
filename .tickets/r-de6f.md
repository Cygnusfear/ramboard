---
id: r-de6f
status: closed
deps: []
links: []
created: 2026-03-01T10:55:02Z
type: task
priority: 2
assignee: Alexander Mangel
tags: [research, delphi-synthesis, architecture]
---
# Delphi synthesis: Full 30+40 architectural review

# Delphi Synthesis: Full 30+40 Architectural Review — Ramboard React SPA

> Synthesized from: Oracle 1 (r-15d3), Oracle 2 (r-59c3), Prior review (r-0cc6)
> Synthesizer: r-bc1d | Method: Independent oracle comparison + deduplication + prioritization

---

## 1. Executive Summary

The Ramboard React SPA is in **good structural health** for a codebase of its size (48 files, ~7,000 lines). The core architecture is sound: five well-scoped Zustand stores, a correctly-extracted pure-function domain layer, clean Base UI usage throughout, and a standout design in `list-interaction.ts` — a pure state machine with zero React dependency that manages complex selection and interaction logic. The post-r-0cc6 context menu refactor (Option B) was correctly implemented: `useMenuActions` now owns all store connections, removing an 11-hop callback chain.

Problems are **concentrated, not systemic**. The two highest-severity classes are: (1) dead code left over from incomplete refactors — most urgently `lib/drag-select.ts` (131 lines, zero imports) and two dead serialization functions in `filter-engine.ts`; and (2) convergence failures where the same business rule or data is defined in two places — status cycle logic, `allTags` computation, `SORT_FIELD_OPTIONS`, and `STATUS_LABELS` are all duplicated, creating silent drift risk when requirements change.

There is also one silently broken feature: the `v` keyboard shortcut for toggling view mode updates `useUIStore.viewMode` (dead state) while the actual view mode is sourced from `useViewStore`. Pressing `v` has zero effect on the displayed view. This is the only user-visible bug found. Beyond that, the primary refactoring opportunity is moving pure domain logic out of component files and into `lib/` where it can be tested and reused independently.

---

## 2. Convergent Findings — What Both Oracles Independently Confirmed

These findings have the **highest confidence** — two independent analyses reached the same conclusion without coordination.

| # | Finding | Severity | Agreement |
|---|---------|----------|-----------|
| C-01 | `lib/drag-select.ts` is dead code (131 lines, 0 imports) | HIGH | Full |
| C-02 | `filter-engine.ts`: `serializeFilters`/`deserializeFilters` dead exports (0 imports) | HIGH | Full |
| C-03 | Status cycle rule duplicated (list-interaction.ts + ticket-detail.tsx) | HIGH | Full |
| C-04 | `allTags` computation duplicated (ticket-context-menu.tsx + tag-editor.tsx) | HIGH | Full |
| C-05 | `SORT_FIELD_OPTIONS`/`SORT_FIELDS` duplicated (board-view.tsx + column-editor.tsx) | HIGH | Full |
| C-06 | `STATUS_LABELS` duplicated (types.ts canonical, status-dot.tsx private copy) | MEDIUM | Full |
| C-07 | `getDefaultValue` pure function misplaced in filter-store.ts | MEDIUM | Full |
| C-08 | filter-store → view-store hidden dynamic import | MEDIUM | Full |
| C-09 | `useProjectViewSetup` in app.tsx mixes routing, filter loading, and URL sync concerns | HIGH | Full |

---

## 3. Divergent Findings — Where Oracles Disagreed

### Severity disagreement: filter-engine dead serialization
- Oracle 1 rated MEDIUM; Oracle 2 rated HIGH.
- **Resolution: HIGH.** The functions are dead AND there's an active parallel implementation in `use-filter-url-sync.ts`. Having dead code that looks like an alternative to live code is more dangerous than simple dead code. Future developers may try to use the dead version.

### Missing from Oracle 1: linkify-ticket-ids.tsx dependency inversion
- Oracle 2 found (DD-1, HIGH): `lib/linkify-ticket-ids.tsx` imports from `@/components/ticket-link` — a `lib/` module depending on the presentation layer.
- Oracle 1 didn't flag this.
- **Resolution: Confirmed HIGH.** Verified: lib/ importing components/ violates 40.03. This is a real architectural inversion.

### Missing from Oracle 2: viewMode dead state + broken 'v' shortcut
- Oracle 1 found (Finding 2, HIGH): `useUIStore.viewMode` is dead state. `use-keyboard.ts:144` calls `ui.toggleViewMode()` but nothing reads `useUIStore.viewMode` for rendering. The 'v' key is silently broken.
- Oracle 2 didn't surface this.
- **Resolution: Confirmed HIGH. User-visible bug.** Verified by tracing: `app.tsx` and `header-bar.tsx` both derive view mode from `useViewStore`, not `useUIStore`.

### Missing from Oracle 1: TICKET_ID_RE regex duplicated
- Oracle 2 found (CF-5): The same regex `TICKET_ID_RE` defined identically in `lib/linkify-ticket-ids.tsx:11` and `components/ticket-link-plugin.ts:11`.
- **Resolution: Confirmed MEDIUM.** Same literal regex string, two files. One should export, one should import.

### Missing from Oracle 1: view-store bypasses lib/api.ts
- Oracle 2 found (DD-3): `view-store.ts` calls `fetch()` directly with no error handling, while all other stores use `lib/api.ts`'s `fetchJson` wrapper.
- **Resolution: Confirmed MEDIUM.** Inconsistent abstraction; view API endpoints should be in `lib/api.ts`.

### Missing from Oracle 1: unimplemented keybindings 'p' and 'X'
- Oracle 2 found (DC-4): Both appear in the keyboard help dialog (`keyboard-help.tsx`) but `use-keyboard.ts` has no case for them. Users see shortcuts listed that do nothing.
- **Resolution: Confirmed MEDIUM.** Two user-visible issues (listed but non-functional shortcuts). Implement or remove.

### Missing from Oracle 2: selection state split ownership
- Oracle 1 found (Finding 1, HIGH): `list-interaction.ts` is the primary owner of selection state, but it syncs to `useUIStore.selectedIds` via a useEffect. `BulkActionBar` and `use-keyboard.ts` read from `useUIStore.selectedIds`. If the sync fires late, they silently diverge.
- **Resolution: Confirmed HIGH.** This is a real 40.01 violation. The selection state has two sources of truth with an asynchronous bridge.

### Missing from Oracle 1: STATUS_COLORS semantic inconsistency
- Oracle 2 found (CF-7): `open` is green in list view (status-dot.tsx) but grey in graph view (graph-view.tsx). `closed` is grey in list but green in graph. This is a UI inconsistency, not a code bug.
- **Resolution: MEDIUM** — user-visible but may be intentional (graph view may use different semantics). Needs product decision before code fix.

---

## 4. Unique Discoveries — Important Findings From One Oracle Only

### From Oracle 1 only:
- **FC-06 (HIGH)**: `viewMode` dead state + silently broken 'v' keyboard shortcut
- **FC-07 (HIGH)**: Selection state split ownership (listInteraction + UIStore sync)
- **FC-15 (MEDIUM)**: Urgent priority icon inconsistency (`ArrowFatDown` in ticket-options vs `Warning` in priority-icon)
- **FC-23 (MEDIUM)**: Tag normalization rule embedded in TagEditor component (`tag-editor.tsx:59`) instead of `lib/tag-mutations.ts`
- **FC-21 (LOW)**: `buildActivityEntries` pure function in `ticket-activity.tsx` should be in `lib/`
- **FC-22 (LOW)**: `computeLayout` pure function in `graph-view.tsx` should be in `lib/`

### From Oracle 2 only:
- **FC-17 (HIGH)**: `lib/linkify-ticket-ids.tsx` imports `components/ticket-link` — inverted dependency
- **FC-03 (MEDIUM)**: `toggleCheckbox` in `api.ts` exported but never imported (possible future feature)
- **FC-04 (MEDIUM)**: Keybindings 'p' (cycle-priority) and 'X' (range-select) listed in help dialog but not implemented in `use-keyboard.ts`
- **FC-13 (MEDIUM)**: `TICKET_ID_RE` regex defined identically in two files
- **FC-14 (MEDIUM)**: `STATUS_COLORS` semantic inconsistency across list and graph views
- **FC-19 (MEDIUM)**: `view-store.ts` calls `fetch()` directly, bypassing `lib/api.ts`
- **FC-05 (LOW)**: `ticket-detail-edit.plan.md` committed inside `src/components/`
- **FC-25 (LOW)**: `getVisibleTickets()` domain query inline in `use-keyboard.ts`

---

## 5. Canonical Finding List

Deduplicated, severity-rated, with file+line citations. Format: `FC-NN | Severity | Confidence | File(s)`.

### DEAD CODE

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-01 | `drag-select.ts` — 131 lines, 0 imports. Superseded by `list-interaction.ts`. | HIGH | BOTH | `lib/drag-select.ts` |
| FC-02 | `serializeFilters`/`deserializeFilters` in filter-engine — 0 imports, dead since url-sync hook was written with a different strategy. | HIGH | BOTH | `lib/filter-engine.ts` |
| FC-03 | `toggleCheckbox` in api.ts — exported but never imported. | MED | O2 | `lib/api.ts` |
| FC-04 | Keybindings 'p' (cycle-priority) and 'X' (range-select) — in keyboard help dialog, not wired in use-keyboard.ts | MED | O2 | `lib/keybindings.ts`, `hooks/use-keyboard.ts` |
| FC-05 | `ticket-detail-edit.plan.md` inside `src/components/` — planning artifact committed to source dir | LOW | O2 | `components/ticket-detail-edit.plan.md` |

### STATE OWNERSHIP VIOLATIONS (40.01)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-06 | `useUIStore.viewMode` dead state. `use-keyboard.ts:144` calls `ui.toggleViewMode()` but rendering reads from `useViewStore`. **'v' shortcut is silently broken.** | HIGH | O1 | `stores/ui-store.ts`, `hooks/use-keyboard.ts:144` |
| FC-07 | Selection split ownership: `list-interaction.ts` owns `selection: Set<string>`, syncs via useEffect to `useUIStore.selectedIds`. `BulkActionBar` + `use-keyboard.ts` read from UIStore. Async sync = divergence risk. | HIGH | O1 | `components/list-view.tsx:199`, `stores/ui-store.ts` |
| FC-08 | `useFilterStore.setState()` called directly from outside store (bypasses action methods + `notifyDirty()`). Current behavior correct but brittle. | LOW | O1 | `app.tsx:69`, `hooks/use-filter-url-sync.ts:98` |

### CONVERGENCE FAILURES (30.02)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-09 | `STATUS_LABELS` duplicated: canonical in `types.ts:32`, private copy in `status-dot.tsx:15`. Identical values. | MED | BOTH | `lib/types.ts:32`, `components/status-dot.tsx:15` |
| FC-10 | Status cycle rule duplicated: `STATUS_CYCLE` map in `list-interaction.ts:27-30`, identical ternary chain in `ticket-detail.tsx:50-52`. Same business rule, two implementations. | HIGH | BOTH | `lib/list-interaction.ts:27`, `components/ticket-detail.tsx:50` |
| FC-11 | `allTags` computation duplicated: identical `useMemo` collecting unique sorted tags in two components. | HIGH | BOTH | `components/ticket-context-menu.tsx:92-98`, `components/tag-editor.tsx:29-34` |
| FC-12 | Sort field options duplicated: `SORT_FIELD_OPTIONS` (board-view.tsx:184) and `SORT_FIELDS` (column-editor.tsx:28) — identical 5-entry arrays, different names. | HIGH | BOTH | `components/board-view.tsx:184`, `components/column-editor.tsx:28` |
| FC-13 | `TICKET_ID_RE` regex defined identically in two files: `/\b([a-z0-9]{1,5}-[a-z0-9]{3,5})\b/gi` | MED | O2 | `lib/linkify-ticket-ids.tsx:11`, `components/ticket-link-plugin.ts:11` |
| FC-14 | `STATUS_COLORS` semantic inconsistency: `open` = green in list, grey in graph; `closed` = grey in list, green in graph. | MED | O2 | `components/status-dot.tsx`, `components/graph-view.tsx` |
| FC-15 | Urgent priority icon inconsistency: `ArrowFatDown` (ticket-options.tsx:19) vs `Warning` (priority-icon.tsx:9). Same priority, two icons. | MED | O1 | `lib/ticket-options.tsx:19`, `components/priority-icon.tsx:9` |

### DEPENDENCY DIRECTION VIOLATIONS (40.03)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-17 | `lib/linkify-ticket-ids.tsx` imports from `@/components/ticket-link` — lib/ importing presentation layer. Inverted dependency. | HIGH | O2 | `lib/linkify-ticket-ids.tsx:4` |
| FC-18 | `filter-store.ts` dynamic-imports `view-store.ts` inside `notifyDirty()` to avoid circular dep. Coupling is hidden from static analysis. | MED | BOTH | `stores/filter-store.ts:33-36` |
| FC-19 | `view-store.ts` calls `fetch()` directly with no error handling, bypassing `lib/api.ts` convention used by all other stores. | MED | O2 | `stores/view-store.ts` |

### MODULE BOUNDARY VIOLATIONS (40.02 / 40.04)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-20 | `getDefaultValue` pure function exported from `filter-store.ts` — zero store dependency, misplaced. Component imports utility from store. | MED | BOTH | `stores/filter-store.ts:83`, `components/column-editor.tsx:17` |
| FC-23 | Tag normalization rule (`trim().toLowerCase().replace(/\s+/g, '-')`) embedded in TagEditor callback, not in `lib/tag-mutations.ts`. | MED | O1 | `components/tag-editor.tsx:59` |
| FC-26 | `useProjectViewSetup` hook defined inline in `app.tsx` (27-75). Complex hook with 4 effects mixing: activeTicket clear, data fetch, URL viewId sync, saved view filter load. | HIGH | BOTH | `app.tsx:27-75` |
| FC-21 | `buildActivityEntries()` pure function in component file — no React, computes domain data, untestable. | LOW | O1 | `components/ticket-activity.tsx:22-90` |
| FC-22 | `computeLayout()` pure function in component file — dagre graph layout computation, no React, untestable. | LOW | O1 | `components/graph-view.tsx:38-90` |
| FC-24 | `BoardToolbar` (77-173) and `BoardView` in same file — independently testable, independently changeable. | LOW | O1 | `components/board-view.tsx:77-173` |
| FC-25 | `getVisibleTickets()` domain query inline in `use-keyboard.ts`. Minor. | LOW | O2 | `hooks/use-keyboard.ts` |

---

## 6. What's Good — Architectural Strengths

Both oracles praised the same strengths. These patterns should be preserved and extended:

1. **`list-interaction.ts` is textbook 40.04 design.** A 301-line pure TypeScript state machine with zero React/DOM dependency. The component is thin glue: calls machine methods, renders machine state. Every complex UI interaction should be structured this way.

2. **Context menu post-refactor (r-0cc6 → commit 9804f4c) is clean.** `useMenuActions()` hook owns all store connections. Zero callback threading. Adding a new menu action requires touching exactly 1 file. This is the correct pattern.

3. **`filter-engine.ts` is correctly pure.** 100% pure functions. Testable without mocks. `applyFiltersAndSort` is independently verifiable.

4. **`tag-mutations.ts` correctly extracted the business rule.** `toggleTagForTickets()` is pure, single-sourced, in `lib/`. Proves the extraction pattern works.

5. **`useFilteredTickets` uses primitive selectors.** Avoids the infinite render loop (fixed r-90d6) by subscribing to primitives, not derived state.

6. **Five well-scoped Zustand stores** — each with a single concern. No god stores. Correct use of `getState()` for imperative access.

7. **Base UI usage is correct throughout.** No hand-rolled dropdowns, modals, or toggles. All interactive elements use `@base-ui-components/react`.

8. **Virtual lists in ListView and BoardColumn.** Both use `@tanstack/react-virtual` correctly with fixed heights.

9. **`useNavigate` centralizes view transitions.** Single hook wrapping the Browser View Transitions API. All navigation through one path.

10. **`linkify-ticket-ids.tsx` correctly extracted and reused.** Used by `linkified-text.tsx`, `use-linkified-markdown.tsx`, and `ticket-link-plugin.ts`. (The import direction is wrong — see FC-17 — but the extraction itself is good.)

11. **`filter-primitives.tsx` correctly shared** — `FilterEditor`, `FilterRow`, `MultiSelectEditor` shared between filter-bar.tsx (list view) and column-editor.tsx (board view) with zero duplication.

---

## 7. Prioritized Refactoring Plan

### Tier 1: Quick wins (< 30 min each, zero risk)

These are pure deletions and trivial constant consolidations. No behavior changes.

| # | Task | Finding | Effort | Risk |
|---|------|---------|--------|------|
| T1-01 | **DELETE** `lib/drag-select.ts` | FC-01 | 2 min | Zero |
| T1-02 | **DELETE** `serializeFilters` + `deserializeFilters` from `filter-engine.ts` | FC-02 | 5 min | Zero |
| T1-03 | **DELETE/MOVE** `src/components/ticket-detail-edit.plan.md` | FC-05 | 2 min | Zero |
| T1-04 | **Fix** `STATUS_LABELS`: delete from `status-dot.tsx`, import from `lib/types.ts` | FC-09 | 10 min | Zero |
| T1-05 | **Export** `TICKET_ID_RE` from `lib/linkify-ticket-ids.tsx`, import in `ticket-link-plugin.ts` | FC-13 | 10 min | Zero |
| T1-06 | **Consolidate** `SORT_FIELD_OPTIONS`/`SORT_FIELDS`: single constant in `lib/types.ts`, update both consumers | FC-12 | 15 min | Zero |
| T1-07 | **Move** `getDefaultValue` from `filter-store.ts` to `filter-engine.ts`, update import in `column-editor.tsx` | FC-20 | 15 min | Zero |
| T1-08 | **Fix** STATUS_CYCLE: export from `lib/types.ts`, import in `list-interaction.ts` and `ticket-detail.tsx` | FC-10 | 15 min | Zero |
| T1-09 | **Extract** `normalizeTag()` to `lib/tag-mutations.ts`, use in `tag-editor.tsx` | FC-23 | 10 min | Zero |
| T1-10 | **Fix** priority icon: decide Warning vs ArrowFatDown, apply consistently | FC-15 | 10 min | Zero |

### Tier 2: Medium refactors (1-3 hours, low risk)

These require understanding of call sites and careful wiring, but are well-scoped.

| # | Task | Finding | Effort | Risk |
|---|------|---------|--------|------|
| T2-01 | **Fix broken 'v' shortcut**: update `use-keyboard.ts` to switch views via `view-store`, then delete `viewMode`/`setViewMode`/`toggleViewMode` from `ui-store.ts` | FC-06 | 45 min | Low |
| T2-02 | **Extract** `allTags` to `hooks/use-all-tags.ts`, replace both `useMemo` instances | FC-11 | 30 min | Low |
| T2-03 | **Fix** `lib/linkify-ticket-ids.tsx` dependency inversion: Option A (move to `components/`), or Option B (return tokens, component builds TicketLink) | FC-17 | 1 hr | Low |
| T2-04 | **Add** view API endpoints to `lib/api.ts`, update `view-store.ts` to use them | FC-19 | 1 hr | Low |
| T2-05 | **Extract** `useProjectViewSetup` from `app.tsx` to `src/hooks/use-project-view-setup.ts` | FC-26 | 1 hr | Low |
| T2-06 | **Fix** `STATUS_COLORS` inconsistency: decide canonical color semantics, apply to `status-dot.tsx` and `graph-view.tsx` | FC-14 | 30 min | Low (product decision needed first) |
| T2-07 | **Resolve** dead API: implement `toggleCheckbox` or delete it from `api.ts` | FC-03 | 30 min | Low |
| T2-08 | **Resolve** unimplemented keybindings: implement 'p' (cycle-priority) and 'X' (range-select) OR remove from keyboard help dialog | FC-04 | 30 min (remove) / 2 hrs (implement) | Low |

### Tier 3: Structural changes (half day+, needs planning)

These touch multiple files or have higher risk and should be planned separately.

| # | Task | Finding | Effort | Risk |
|---|------|---------|--------|------|
| T3-01 | **Fix selection ownership**: decide canonical store (UIStore vs ListInteraction), update all readers to single source | FC-07 | 2-3 hrs | Medium |
| T3-02 | **Push dirty tracking** to `app.tsx`: subscribe to filterStore, call `viewStore.markDirty()` explicitly, remove dynamic import from `filter-store.ts` | FC-18 | 1.5 hrs | Medium (careful subscription timing) |
| T3-03 | **Extract** `buildActivityEntries` to `lib/ticket-activity.ts` | FC-21 | 30 min | Low |
| T3-04 | **Extract** `computeLayout` to `lib/graph-layout.ts` | FC-22 | 30 min | Low |
| T3-05 | **Extract** `BoardToolbar` from `board-view.tsx` to its own file | FC-24 | 1 hr | Low |

---

## 8. Dependency Graph — Which Refactors Enable or Block Others

```
T1-08 (STATUS_CYCLE to types.ts)
  └─ enables: FC-10 full resolution. No further deps.

T1-05 (export TICKET_ID_RE)
  └─ should be done BEFORE T2-03 (linkify dep fix), since moving the
     file changes the export location

T2-03 (fix linkify-ticket-ids.tsx dep direction)
  └─ if Option A (move to components/): update T1-05 import path
  └─ if Option B (return tokens): T1-05 stays as-is, plugin uses exported regex

T2-05 (extract useProjectViewSetup to hooks/)
  └─ should be done BEFORE T3-02 (push dirty tracking to app level),
     since the extracted hook is where dirty tracking should live

T3-02 (push dirty tracking to app.tsx)
  └─ depends on: T2-05 (hook extraction) for cleaner placement
  └─ depends on: T2-04 (view API to lib/api.ts) (independent but same area)

T2-01 (fix viewMode dead state + 'v' shortcut)
  └─ enables: T3-01 (selection ownership) — both clean up UIStore; better done sequentially

T1-07 (move getDefaultValue to filter-engine.ts)
  └─ independent; no deps

T2-02 (allTags hook extraction)
  └─ independent; no deps

T1-06 (consolidate SORT_FIELD_OPTIONS)
  └─ independent; no deps

T1-04 (fix STATUS_LABELS in status-dot)
  └─ independent; no deps

T1-01, T1-02, T1-03 (delete dead code)
  └─ fully independent; do these first
```

**Recommended execution order:**
1. All T1 items (no deps, low risk, high signal-to-noise)
2. T2-01 (fix user-visible bug)
3. T2-02, T2-03, T2-04 (convergence + deps)
4. T2-05 (hook extraction, enables T3-02)
5. T2-06, T2-07, T2-08 (product decisions needed)
6. T3-01, T3-02 (structural, after T2-01 and T2-05)
7. T3-03, T3-04, T3-05 (extract pure logic, independent)

---

## 9. Confidence Assessment

**HIGH confidence (both oracles verified by code reads + grep):**
- C-01 through C-09 (convergent findings)
- FC-01 (`drag-select.ts` dead) — verified: `rg "from.*drag-select" src/` = 0 results
- FC-02 (`serializeFilters` dead) — verified: `rg "serializeFilters" src/` = 0 import sites
- FC-06 (`viewMode` broken) — verified: `grep -n "viewMode" src/ -r` shows only definitions + writers, no readers for rendering
- FC-10 (status cycle duplication) — exact code locations confirmed in both oracles
- FC-11 (allTags duplication) — exact code locations confirmed in both oracles
- FC-12 (SORT_FIELDS duplication) — exact code locations confirmed in both oracles
- FC-17 (linkify-ticket-ids.tsx dep inversion) — import statement confirmed

**MEDIUM confidence (one oracle, plausible):**
- FC-03 (`toggleCheckbox` dead) — one oracle, plausible
- FC-04 (unimplemented keybindings) — one oracle, verify in keyboard-help.tsx
- FC-07 (selection ownership) — one oracle, detailed analysis, high plausibility
- FC-13 (TICKET_ID_RE duplication) — one oracle, verify regex string equality
- FC-14 (STATUS_COLORS inconsistency) — one oracle, may be intentional
- FC-19 (view-store raw fetch) — one oracle, verify api.ts scope
- FC-26 (useProjectViewSetup complexity) — both oracles, but 'fix' approach needs design

**LOWER confidence / needs product decision:**
- FC-06 fix strategy: how to wire 'v' shortcut to viewStore needs design (views may not always have a board/list pair)
- FC-07 fix strategy: making UIStore canonical vs making ListInteraction write to UIStore — both valid
- FC-14: STATUS_COLORS may be semantically intentional (graph = DAG status vs list = workflow status)

---

## Totals

- **Total findings**: 26 canonical (FC-01 through FC-26)
- **HIGH severity**: 8 (FC-01, FC-02, FC-06, FC-07, FC-10, FC-11, FC-12, FC-17, FC-26)
- **MEDIUM severity**: 12 (FC-03, FC-04, FC-09, FC-13, FC-14, FC-15, FC-18, FC-19, FC-20, FC-23, FC-24 (LOW bumped), FC-25 (LOW))
- **LOW severity**: 6 (FC-05, FC-08, FC-21, FC-22, FC-24, FC-25)
- **User-visible bugs**: 2 (FC-06: 'v' shortcut broken; FC-04: listed shortcuts that do nothing)
- **Dead code to delete**: 5 files/exports (FC-01, FC-02, FC-03 partial, FC-04 partial, FC-05)



## Goal
# Delphi Synthesis: Full 30+40 Architectural Review — Ramboard React SPA

> Synthesized from: Oracle 1 (r-15d3), Oracle 2 (r-59c3), Prior review (r-0cc6)
> Synthesizer: r-bc1d | Method: Independent oracle comparison + deduplication + prioritization

---

## 1. Executive Summary

The Ramboard React SPA is in **good structural health** for a codebase of its size (48 files, ~7,000 lines). The core architecture is sound: five well-scoped Zustand stores, a correctly-extracted pure-function domain layer, clean Base UI usage throughout, and a standout design in `list-interaction.ts` — a pure state machine with zero React dependency that manages complex selection and interaction logic. The post-r-0cc6 context menu refactor (Option B) was correctly implemented: `useMenuActions` now owns all store connections, removing an 11-hop callback chain.

Problems are **concentrated, not systemic**. The two highest-severity classes are: (1) dead code left over from incomplete refactors — most urgently `lib/drag-select.ts` (131 lines, zero imports) and two dead serialization functions in `filter-engine.ts`; and (2) convergence failures where the same business rule or data is defined in two places — status cycle logic, `allTags` computation, `SORT_FIELD_OPTIONS`, and `STATUS_LABELS` are all duplicated, creating silent drift risk when requirements change.

There is also one silently broken feature: the `v` keyboard shortcut for toggling view mode updates `useUIStore.viewMode` (dead state) while the actual view mode is sourced from `useViewStore`. Pressing `v` has zero effect on the displayed view. This is the only user-visible bug found. Beyond that, the primary refactoring opportunity is moving pure domain logic out of component files and into `lib/` where it can be tested and reused independently.

---

## 2. Convergent Findings — What Both Oracles Independently Confirmed

These findings have the **highest confidence** — two independent analyses reached the same conclusion without coordination.

| # | Finding | Severity | Agreement |
|---|---------|----------|-----------|
| C-01 | `lib/drag-select.ts` is dead code (131 lines, 0 imports) | HIGH | Full |
| C-02 | `filter-engine.ts`: `serializeFilters`/`deserializeFilters` dead exports (0 imports) | HIGH | Full |
| C-03 | Status cycle rule duplicated (list-interaction.ts + ticket-detail.tsx) | HIGH | Full |
| C-04 | `allTags` computation duplicated (ticket-context-menu.tsx + tag-editor.tsx) | HIGH | Full |
| C-05 | `SORT_FIELD_OPTIONS`/`SORT_FIELDS` duplicated (board-view.tsx + column-editor.tsx) | HIGH | Full |
| C-06 | `STATUS_LABELS` duplicated (types.ts canonical, status-dot.tsx private copy) | MEDIUM | Full |
| C-07 | `getDefaultValue` pure function misplaced in filter-store.ts | MEDIUM | Full |
| C-08 | filter-store → view-store hidden dynamic import | MEDIUM | Full |
| C-09 | `useProjectViewSetup` in app.tsx mixes routing, filter loading, and URL sync concerns | HIGH | Full |

---

## 3. Divergent Findings — Where Oracles Disagreed

### Severity disagreement: filter-engine dead serialization
- Oracle 1 rated MEDIUM; Oracle 2 rated HIGH.
- **Resolution: HIGH.** The functions are dead AND there's an active parallel implementation in `use-filter-url-sync.ts`. Having dead code that looks like an alternative to live code is more dangerous than simple dead code. Future developers may try to use the dead version.

### Missing from Oracle 1: linkify-ticket-ids.tsx dependency inversion
- Oracle 2 found (DD-1, HIGH): `lib/linkify-ticket-ids.tsx` imports from `@/components/ticket-link` — a `lib/` module depending on the presentation layer.
- Oracle 1 didn't flag this.
- **Resolution: Confirmed HIGH.** Verified: lib/ importing components/ violates 40.03. This is a real architectural inversion.

### Missing from Oracle 2: viewMode dead state + broken 'v' shortcut
- Oracle 1 found (Finding 2, HIGH): `useUIStore.viewMode` is dead state. `use-keyboard.ts:144` calls `ui.toggleViewMode()` but nothing reads `useUIStore.viewMode` for rendering. The 'v' key is silently broken.
- Oracle 2 didn't surface this.
- **Resolution: Confirmed HIGH. User-visible bug.** Verified by tracing: `app.tsx` and `header-bar.tsx` both derive view mode from `useViewStore`, not `useUIStore`.

### Missing from Oracle 1: TICKET_ID_RE regex duplicated
- Oracle 2 found (CF-5): The same regex `TICKET_ID_RE` defined identically in `lib/linkify-ticket-ids.tsx:11` and `components/ticket-link-plugin.ts:11`.
- **Resolution: Confirmed MEDIUM.** Same literal regex string, two files. One should export, one should import.

### Missing from Oracle 1: view-store bypasses lib/api.ts
- Oracle 2 found (DD-3): `view-store.ts` calls `fetch()` directly with no error handling, while all other stores use `lib/api.ts`'s `fetchJson` wrapper.
- **Resolution: Confirmed MEDIUM.** Inconsistent abstraction; view API endpoints should be in `lib/api.ts`.

### Missing from Oracle 1: unimplemented keybindings 'p' and 'X'
- Oracle 2 found (DC-4): Both appear in the keyboard help dialog (`keyboard-help.tsx`) but `use-keyboard.ts` has no case for them. Users see shortcuts listed that do nothing.
- **Resolution: Confirmed MEDIUM.** Two user-visible issues (listed but non-functional shortcuts). Implement or remove.

### Missing from Oracle 2: selection state split ownership
- Oracle 1 found (Finding 1, HIGH): `list-interaction.ts` is the primary owner of selection state, but it syncs to `useUIStore.selectedIds` via a useEffect. `BulkActionBar` and `use-keyboard.ts` read from `useUIStore.selectedIds`. If the sync fires late, they silently diverge.
- **Resolution: Confirmed HIGH.** This is a real 40.01 violation. The selection state has two sources of truth with an asynchronous bridge.

### Missing from Oracle 1: STATUS_COLORS semantic inconsistency
- Oracle 2 found (CF-7): `open` is green in list view (status-dot.tsx) but grey in graph view (graph-view.tsx). `closed` is grey in list but green in graph. This is a UI inconsistency, not a code bug.
- **Resolution: MEDIUM** — user-visible but may be intentional (graph view may use different semantics). Needs product decision before code fix.

---

## 4. Unique Discoveries — Important Findings From One Oracle Only

### From Oracle 1 only:
- **FC-06 (HIGH)**: `viewMode` dead state + silently broken 'v' keyboard shortcut
- **FC-07 (HIGH)**: Selection state split ownership (listInteraction + UIStore sync)
- **FC-15 (MEDIUM)**: Urgent priority icon inconsistency (`ArrowFatDown` in ticket-options vs `Warning` in priority-icon)
- **FC-23 (MEDIUM)**: Tag normalization rule embedded in TagEditor component (`tag-editor.tsx:59`) instead of `lib/tag-mutations.ts`
- **FC-21 (LOW)**: `buildActivityEntries` pure function in `ticket-activity.tsx` should be in `lib/`
- **FC-22 (LOW)**: `computeLayout` pure function in `graph-view.tsx` should be in `lib/`

### From Oracle 2 only:
- **FC-17 (HIGH)**: `lib/linkify-ticket-ids.tsx` imports `components/ticket-link` — inverted dependency
- **FC-03 (MEDIUM)**: `toggleCheckbox` in `api.ts` exported but never imported (possible future feature)
- **FC-04 (MEDIUM)**: Keybindings 'p' (cycle-priority) and 'X' (range-select) listed in help dialog but not implemented in `use-keyboard.ts`
- **FC-13 (MEDIUM)**: `TICKET_ID_RE` regex defined identically in two files
- **FC-14 (MEDIUM)**: `STATUS_COLORS` semantic inconsistency across list and graph views
- **FC-19 (MEDIUM)**: `view-store.ts` calls `fetch()` directly, bypassing `lib/api.ts`
- **FC-05 (LOW)**: `ticket-detail-edit.plan.md` committed inside `src/components/`
- **FC-25 (LOW)**: `getVisibleTickets()` domain query inline in `use-keyboard.ts`

---

## 5. Canonical Finding List

Deduplicated, severity-rated, with file+line citations. Format: `FC-NN | Severity | Confidence | File(s)`.

### DEAD CODE

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-01 | `drag-select.ts` — 131 lines, 0 imports. Superseded by `list-interaction.ts`. | HIGH | BOTH | `lib/drag-select.ts` |
| FC-02 | `serializeFilters`/`deserializeFilters` in filter-engine — 0 imports, dead since url-sync hook was written with a different strategy. | HIGH | BOTH | `lib/filter-engine.ts` |
| FC-03 | `toggleCheckbox` in api.ts — exported but never imported. | MED | O2 | `lib/api.ts` |
| FC-04 | Keybindings 'p' (cycle-priority) and 'X' (range-select) — in keyboard help dialog, not wired in use-keyboard.ts | MED | O2 | `lib/keybindings.ts`, `hooks/use-keyboard.ts` |
| FC-05 | `ticket-detail-edit.plan.md` inside `src/components/` — planning artifact committed to source dir | LOW | O2 | `components/ticket-detail-edit.plan.md` |

### STATE OWNERSHIP VIOLATIONS (40.01)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-06 | `useUIStore.viewMode` dead state. `use-keyboard.ts:144` calls `ui.toggleViewMode()` but rendering reads from `useViewStore`. **'v' shortcut is silently broken.** | HIGH | O1 | `stores/ui-store.ts`, `hooks/use-keyboard.ts:144` |
| FC-07 | Selection split ownership: `list-interaction.ts` owns `selection: Set<string>`, syncs via useEffect to `useUIStore.selectedIds`. `BulkActionBar` + `use-keyboard.ts` read from UIStore. Async sync = divergence risk. | HIGH | O1 | `components/list-view.tsx:199`, `stores/ui-store.ts` |
| FC-08 | `useFilterStore.setState()` called directly from outside store (bypasses action methods + `notifyDirty()`). Current behavior correct but brittle. | LOW | O1 | `app.tsx:69`, `hooks/use-filter-url-sync.ts:98` |

### CONVERGENCE FAILURES (30.02)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-09 | `STATUS_LABELS` duplicated: canonical in `types.ts:32`, private copy in `status-dot.tsx:15`. Identical values. | MED | BOTH | `lib/types.ts:32`, `components/status-dot.tsx:15` |
| FC-10 | Status cycle rule duplicated: `STATUS_CYCLE` map in `list-interaction.ts:27-30`, identical ternary chain in `ticket-detail.tsx:50-52`. Same business rule, two implementations. | HIGH | BOTH | `lib/list-interaction.ts:27`, `components/ticket-detail.tsx:50` |
| FC-11 | `allTags` computation duplicated: identical `useMemo` collecting unique sorted tags in two components. | HIGH | BOTH | `components/ticket-context-menu.tsx:92-98`, `components/tag-editor.tsx:29-34` |
| FC-12 | Sort field options duplicated: `SORT_FIELD_OPTIONS` (board-view.tsx:184) and `SORT_FIELDS` (column-editor.tsx:28) — identical 5-entry arrays, different names. | HIGH | BOTH | `components/board-view.tsx:184`, `components/column-editor.tsx:28` |
| FC-13 | `TICKET_ID_RE` regex defined identically in two files: `/\b([a-z0-9]{1,5}-[a-z0-9]{3,5})\b/gi` | MED | O2 | `lib/linkify-ticket-ids.tsx:11`, `components/ticket-link-plugin.ts:11` |
| FC-14 | `STATUS_COLORS` semantic inconsistency: `open` = green in list, grey in graph; `closed` = grey in list, green in graph. | MED | O2 | `components/status-dot.tsx`, `components/graph-view.tsx` |
| FC-15 | Urgent priority icon inconsistency: `ArrowFatDown` (ticket-options.tsx:19) vs `Warning` (priority-icon.tsx:9). Same priority, two icons. | MED | O1 | `lib/ticket-options.tsx:19`, `components/priority-icon.tsx:9` |

### DEPENDENCY DIRECTION VIOLATIONS (40.03)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-17 | `lib/linkify-ticket-ids.tsx` imports from `@/components/ticket-link` — lib/ importing presentation layer. Inverted dependency. | HIGH | O2 | `lib/linkify-ticket-ids.tsx:4` |
| FC-18 | `filter-store.ts` dynamic-imports `view-store.ts` inside `notifyDirty()` to avoid circular dep. Coupling is hidden from static analysis. | MED | BOTH | `stores/filter-store.ts:33-36` |
| FC-19 | `view-store.ts` calls `fetch()` directly with no error handling, bypassing `lib/api.ts` convention used by all other stores. | MED | O2 | `stores/view-store.ts` |

### MODULE BOUNDARY VIOLATIONS (40.02 / 40.04)

| ID | Description | Sev | Conf | File(s) |
|----|-------------|-----|------|---------|
| FC-20 | `getDefaultValue` pure function exported from `filter-store.ts` — zero store dependency, misplaced. Component imports utility from store. | MED | BOTH | `stores/filter-store.ts:83`, `components/column-editor.tsx:17` |
| FC-23 | Tag normalization rule (`trim().toLowerCase().replace(/\s+/g, '-')`) embedded in TagEditor callback, not in `lib/tag-mutations.ts`. | MED | O1 | `components/tag-editor.tsx:59` |
| FC-26 | `useProjectViewSetup` hook defined inline in `app.tsx` (27-75). Complex hook with 4 effects mixing: activeTicket clear, data fetch, URL viewId sync, saved view filter load. | HIGH | BOTH | `app.tsx:27-75` |
| FC-21 | `buildActivityEntries()` pure function in component file — no React, computes domain data, untestable. | LOW | O1 | `components/ticket-activity.tsx:22-90` |
| FC-22 | `computeLayout()` pure function in component file — dagre graph layout computation, no React, untestable. | LOW | O1 | `components/graph-view.tsx:38-90` |
| FC-24 | `BoardToolbar` (77-173) and `BoardView` in same file — independently testable, independently changeable. | LOW | O1 | `components/board-view.tsx:77-173` |
| FC-25 | `getVisibleTickets()` domain query inline in `use-keyboard.ts`. Minor. | LOW | O2 | `hooks/use-keyboard.ts` |

---

## 6. What's Good — Architectural Strengths

Both oracles praised the same strengths. These patterns should be preserved and extended:

1. **`list-interaction.ts` is textbook 40.04 design.** A 301-line pure TypeScript state machine with zero React/DOM dependency. The component is thin glue: calls machine methods, renders machine state. Every complex UI interaction should be structured this way.

2. **Context menu post-refactor (r-0cc6 → commit 9804f4c) is clean.** `useMenuActions()` hook owns all store connections. Zero callback threading. Adding a new menu action requires touching exactly 1 file. This is the correct pattern.

3. **`filter-engine.ts` is correctly pure.** 100% pure functions. Testable without mocks. `applyFiltersAndSort` is independently verifiable.

4. **`tag-mutations.ts` correctly extracted the business rule.** `toggleTagForTickets()` is pure, single-sourced, in `lib/`. Proves the extraction pattern works.

5. **`useFilteredTickets` uses primitive selectors.** Avoids the infinite render loop (fixed r-90d6) by subscribing to primitives, not derived state.

6. **Five well-scoped Zustand stores** — each with a single concern. No god stores. Correct use of `getState()` for imperative access.

7. **Base UI usage is correct throughout.** No hand-rolled dropdowns, modals, or toggles. All interactive elements use `@base-ui-components/react`.

8. **Virtual lists in ListView and BoardColumn.** Both use `@tanstack/react-virtual` correctly with fixed heights.

9. **`useNavigate` centralizes view transitions.** Single hook wrapping the Browser View Transitions API. All navigation through one path.

10. **`linkify-ticket-ids.tsx` correctly extracted and reused.** Used by `linkified-text.tsx`, `use-linkified-markdown.tsx`, and `ticket-link-plugin.ts`. (The import direction is wrong — see FC-17 — but the extraction itself is good.)

11. **`filter-primitives.tsx` correctly shared** — `FilterEditor`, `FilterRow`, `MultiSelectEditor` shared between filter-bar.tsx (list view) and column-editor.tsx (board view) with zero duplication.

---

## 7. Prioritized Refactoring Plan

### Tier 1: Quick wins (< 30 min each, zero risk)

These are pure deletions and trivial constant consolidations. No behavior changes.

| # | Task | Finding | Effort | Risk |
|---|------|---------|--------|------|
| T1-01 | **DELETE** `lib/drag-select.ts` | FC-01 | 2 min | Zero |
| T1-02 | **DELETE** `serializeFilters` + `deserializeFilters` from `filter-engine.ts` | FC-02 | 5 min | Zero |
| T1-03 | **DELETE/MOVE** `src/components/ticket-detail-edit.plan.md` | FC-05 | 2 min | Zero |
| T1-04 | **Fix** `STATUS_LABELS`: delete from `status-dot.tsx`, import from `lib/types.ts` | FC-09 | 10 min | Zero |
| T1-05 | **Export** `TICKET_ID_RE` from `lib/linkify-ticket-ids.tsx`, import in `ticket-link-plugin.ts` | FC-13 | 10 min | Zero |
| T1-06 | **Consolidate** `SORT_FIELD_OPTIONS`/`SORT_FIELDS`: single constant in `lib/types.ts`, update both consumers | FC-12 | 15 min | Zero |
| T1-07 | **Move** `getDefaultValue` from `filter-store.ts` to `filter-engine.ts`, update import in `column-editor.tsx` | FC-20 | 15 min | Zero |
| T1-08 | **Fix** STATUS_CYCLE: export from `lib/types.ts`, import in `list-interaction.ts` and `ticket-detail.tsx` | FC-10 | 15 min | Zero |
| T1-09 | **Extract** `normalizeTag()` to `lib/tag-mutations.ts`, use in `tag-editor.tsx` | FC-23 | 10 min | Zero |
| T1-10 | **Fix** priority icon: decide Warning vs ArrowFatDown, apply consistently | FC-15 | 10 min | Zero |

### Tier 2: Medium refactors (1-3 hours, low risk)

These require understanding of call sites and careful wiring, but are well-scoped.

| # | Task | Finding | Effort | Risk |
|---|------|---------|--------|------|
| T2-01 | **Fix broken 'v' shortcut**: update `use-keyboard.ts` to switch views via `view-store`, then delete `viewMode`/`setViewMode`/`toggleViewMode` from `ui-store.ts` | FC-06 | 45 min | Low |
| T2-02 | **Extract** `allTags` to `hooks/use-all-tags.ts`, replace both `useMemo` instances | FC-11 | 30 min | Low |
| T2-03 | **Fix** `lib/linkify-ticket-ids.tsx` dependency inversion: Option A (move to `components/`), or Option B (return tokens, component builds TicketLink) | FC-17 | 1 hr | Low |
| T2-04 | **Add** view API endpoints to `lib/api.ts`, update `view-store.ts` to use them | FC-19 | 1 hr | Low |
| T2-05 | **Extract** `useProjectViewSetup` from `app.tsx` to `src/hooks/use-project-view-setup.ts` | FC-26 | 1 hr | Low |
| T2-06 | **Fix** `STATUS_COLORS` inconsistency: decide canonical color semantics, apply to `status-dot.tsx` and `graph-view.tsx` | FC-14 | 30 min | Low (product decision needed first) |
| T2-07 | **Resolve** dead API: implement `toggleCheckbox` or delete it from `api.ts` | FC-03 | 30 min | Low |
| T2-08 | **Resolve** unimplemented keybindings: implement 'p' (cycle-priority) and 'X' (range-select) OR remove from keyboard help dialog | FC-04 | 30 min (remove) / 2 hrs (implement) | Low |

### Tier 3: Structural changes (half day+, needs planning)

These touch multiple files or have higher risk and should be planned separately.

| # | Task | Finding | Effort | Risk |
|---|------|---------|--------|------|
| T3-01 | **Fix selection ownership**: decide canonical store (UIStore vs ListInteraction), update all readers to single source | FC-07 | 2-3 hrs | Medium |
| T3-02 | **Push dirty tracking** to `app.tsx`: subscribe to filterStore, call `viewStore.markDirty()` explicitly, remove dynamic import from `filter-store.ts` | FC-18 | 1.5 hrs | Medium (careful subscription timing) |
| T3-03 | **Extract** `buildActivityEntries` to `lib/ticket-activity.ts` | FC-21 | 30 min | Low |
| T3-04 | **Extract** `computeLayout` to `lib/graph-layout.ts` | FC-22 | 30 min | Low |
| T3-05 | **Extract** `BoardToolbar` from `board-view.tsx` to its own file | FC-24 | 1 hr | Low |

---

## 8. Dependency Graph — Which Refactors Enable or Block Others

```
T1-08 (STATUS_CYCLE to types.ts)
  └─ enables: FC-10 full resolution. No further deps.

T1-05 (export TICKET_ID_RE)
  └─ should be done BEFORE T2-03 (linkify dep fix), since moving the
     file changes the export location

T2-03 (fix linkify-ticket-ids.tsx dep direction)
  └─ if Option A (move to components/): update T1-05 import path
  └─ if Option B (return tokens): T1-05 stays as-is, plugin uses exported regex

T2-05 (extract useProjectViewSetup to hooks/)
  └─ should be done BEFORE T3-02 (push dirty tracking to app level),
     since the extracted hook is where dirty tracking should live

T3-02 (push dirty tracking to app.tsx)
  └─ depends on: T2-05 (hook extraction) for cleaner placement
  └─ depends on: T2-04 (view API to lib/api.ts) (independent but same area)

T2-01 (fix viewMode dead state + 'v' shortcut)
  └─ enables: T3-01 (selection ownership) — both clean up UIStore; better done sequentially

T1-07 (move getDefaultValue to filter-engine.ts)
  └─ independent; no deps

T2-02 (allTags hook extraction)
  └─ independent; no deps

T1-06 (consolidate SORT_FIELD_OPTIONS)
  └─ independent; no deps

T1-04 (fix STATUS_LABELS in status-dot)
  └─ independent; no deps

T1-01, T1-02, T1-03 (delete dead code)
  └─ fully independent; do these first
```

**Recommended execution order:**
1. All T1 items (no deps, low risk, high signal-to-noise)
2. T2-01 (fix user-visible bug)
3. T2-02, T2-03, T2-04 (convergence + deps)
4. T2-05 (hook extraction, enables T3-02)
5. T2-06, T2-07, T2-08 (product decisions needed)
6. T3-01, T3-02 (structural, after T2-01 and T2-05)
7. T3-03, T3-04, T3-05 (extract pure logic, independent)

---

## 9. Confidence Assessment

**HIGH confidence (both oracles verified by code reads + grep):**
- C-01 through C-09 (convergent findings)
- FC-01 (`drag-select.ts` dead) — verified: `rg "from.*drag-select" src/` = 0 results
- FC-02 (`serializeFilters` dead) — verified: `rg "serializeFilters" src/` = 0 import sites
- FC-06 (`viewMode` broken) — verified: `grep -n "viewMode" src/ -r` shows only definitions + writers, no readers for rendering
- FC-10 (status cycle duplication) — exact code locations confirmed in both oracles
- FC-11 (allTags duplication) — exact code locations confirmed in both oracles
- FC-12 (SORT_FIELDS duplication) — exact code locations confirmed in both oracles
- FC-17 (linkify-ticket-ids.tsx dep inversion) — import statement confirmed

**MEDIUM confidence (one oracle, plausible):**
- FC-03 (`toggleCheckbox` dead) — one oracle, plausible
- FC-04 (unimplemented keybindings) — one oracle, verify in keyboard-help.tsx
- FC-07 (selection ownership) — one oracle, detailed analysis, high plausibility
- FC-13 (TICKET_ID_RE duplication) — one oracle, verify regex string equality
- FC-14 (STATUS_COLORS inconsistency) — one oracle, may be intentional
- FC-19 (view-store raw fetch) — one oracle, verify api.ts scope
- FC-26 (useProjectViewSetup complexity) — both oracles, but 'fix' approach needs design

**LOWER confidence / needs product decision:**
- FC-06 fix strategy: how to wire 'v' shortcut to viewStore needs design (views may not always have a board/list pair)
- FC-07 fix strategy: making UIStore canonical vs making ListInteraction write to UIStore — both valid
- FC-14: STATUS_COLORS may be semantically intentional (graph = DAG status vs list = workflow status)

---

## Totals

- **Total findings**: 26 canonical (FC-01 through FC-26)
- **HIGH severity**: 8 (FC-01, FC-02, FC-06, FC-07, FC-10, FC-11, FC-12, FC-17, FC-26)
- **MEDIUM severity**: 12 (FC-03, FC-04, FC-09, FC-13, FC-14, FC-15, FC-18, FC-19, FC-20, FC-23, FC-24 (LOW bumped), FC-25 (LOW))
- **LOW severity**: 6 (FC-05, FC-08, FC-21, FC-22, FC-24, FC-25)
- **User-visible bugs**: 2 (FC-06: 'v' shortcut broken; FC-04: listed shortcuts that do nothing)
- **Dead code to delete**: 5 files/exports (FC-01, FC-02, FC-03 partial, FC-04 partial, FC-05)

## Acceptance Criteria
- [ ] TODO

## Verification
- [ ] TODO

## Worktree
- .
