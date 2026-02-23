/**
 * Drag-select engine — pure state machine for mouse-driven range selection.
 * No React, no DOM — just tracks indices and emits selection sets.
 *
 * Usage flow:
 *   start(index) → move(index) → end() → get selectedIndices
 *
 * Supports:
 *   - Click-and-drag range selection
 *   - Shift+click to extend from anchor
 *   - Cmd/Ctrl+click to toggle individual items
 */

export interface DragSelectState {
  /** Is a drag currently in progress? */
  dragging: boolean
  /** Index where the drag started */
  anchorIndex: number
  /** Current end of drag range */
  currentIndex: number
  /** Selection before drag started (for additive drags) */
  baseSelection: Set<number>
  /** Computed selection during/after drag */
  selection: Set<number>
}

export function createDragSelectState(): DragSelectState {
  return {
    dragging: false,
    anchorIndex: -1,
    currentIndex: -1,
    baseSelection: new Set(),
    selection: new Set(),
  }
}

/** Start a drag from the given index */
export function dragStart(
  state: DragSelectState,
  index: number,
  modifiers: { shift?: boolean; meta?: boolean },
): DragSelectState {
  if (modifiers.meta) {
    // Toggle single item
    const next = new Set(state.selection)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    return {
      ...state,
      anchorIndex: index,
      currentIndex: index,
      selection: next,
      baseSelection: next,
      dragging: false,
    }
  }

  if (modifiers.shift && state.anchorIndex >= 0) {
    // Extend range from anchor
    const selection = rangeSet(state.anchorIndex, index)
    // Merge with existing
    for (const i of state.baseSelection) selection.add(i)
    return {
      ...state,
      currentIndex: index,
      selection,
      dragging: false,
    }
  }

  // Normal click — start drag, set anchor
  return {
    dragging: true,
    anchorIndex: index,
    currentIndex: index,
    baseSelection: new Set(),
    selection: new Set([index]),
  }
}

/** Update drag position */
export function dragMove(state: DragSelectState, index: number): DragSelectState {
  if (!state.dragging) return state
  if (index === state.currentIndex) return state

  const selection = rangeSet(state.anchorIndex, index)
  for (const i of state.baseSelection) selection.add(i)

  return {
    ...state,
    currentIndex: index,
    selection,
  }
}

/** End drag */
export function dragEnd(state: DragSelectState): DragSelectState {
  return {
    ...state,
    dragging: false,
    baseSelection: state.selection,
  }
}

/** Clear all selection */
export function dragClear(): DragSelectState {
  return createDragSelectState()
}

/** Select all items in range [0, count) */
export function dragSelectAll(count: number): DragSelectState {
  const selection = new Set<number>()
  for (let i = 0; i < count; i++) selection.add(i)
  return {
    dragging: false,
    anchorIndex: 0,
    currentIndex: count - 1,
    baseSelection: selection,
    selection,
  }
}

// ── Helpers ───────────────────────────────────────────────────

function rangeSet(a: number, b: number): Set<number> {
  const start = Math.min(a, b)
  const end = Math.max(a, b)
  const set = new Set<number>()
  for (let i = start; i <= end; i++) set.add(i)
  return set
}
