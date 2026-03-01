import { useFilteredTickets } from "@/hooks/use-filtered-tickets";
import {
  createListInteraction,
  type ListInteraction,
  type ListViewState,
} from "@/lib/list-interaction";
import type { SortField, TicketSummary } from "@/lib/types";
import { useFilterStore } from "@/stores/filter-store";
import { useProjectStore } from "@/stores/project-store";
import { useTicketStore } from "@/stores/ticket-store";
import { useUIStore } from "@/stores/ui-store";
import { CaretDown, CaretUp, Check } from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useEffect, useRef, useState } from "react";
import { LinkifiedText } from "./linkified-text";
import { PriorityIcon } from "./priority-icon";
import { StatusDot } from "./status-dot";
import { TagList } from "./tag-pill";
import { DotMenu, TicketContextMenu } from "./ticket-context-menu";
import { useNavigate } from "@/hooks/use-navigate";

// ── Constants ─────────────────────────────────────────────────

const ROW_HEIGHT = 36;

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const days = Math.floor((now - then) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── Sort header ───────────────────────────────────────────────

function SortHeader({
  field,
  label,
  className,
}: {
  field: SortField;
  label: string;
  className?: string;
}) {
  const { sortField, sortDir, setSort } = useFilterStore();
  const active = sortField === field;

  return (
    <button
      onClick={() => setSort(field)}
      className={`flex items-center gap-0.5 text-[11px] uppercase tracking-wider select-none ${
        active ? "text-zinc-300" : "text-zinc-600 hover:text-zinc-400"
      } ${className ?? ""}`}
    >
      {label}
      {active &&
        (sortDir === "asc" ? (
          <CaretUp size={10} weight="bold" />
        ) : (
          <CaretDown size={10} weight="bold" />
        ))}
    </button>
  );
}

// ── Single row — memoized ─────────────────────────────────────

const ListRow = memo(function ListRow({
  ticket,
  index,
  isHighlighted,
  isSelected,
}: {
  ticket: TicketSummary;
  index: number;
  isHighlighted: boolean;
  isSelected: boolean;
}) {
  return (
    <div
      data-index={index}
      className={`list-row group/row grid h-9 w-full cursor-default grid-cols-[20px_28px_1fr_72px_96px_64px] items-center gap-0 border-b border-zinc-800/40 px-2 ${
        isSelected ? "bg-blue-500/[0.07]" : isHighlighted ? "bg-zinc-800/40" : ticket.tags?.includes("board-review") ? "bg-yellow-500/10" : ""
      }`}
    >
      {/* ··· dot menu */}
      <div data-action="menu" className="flex items-center justify-center">
        <DotMenu ticket={ticket} />
      </div>

      {/* Checkbox */}
      <div
        data-action="checkbox"
        className={`flex items-center justify-center ${
          isSelected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
        }`}
      >
        <div
          className={`flex size-4 items-center justify-center rounded border ${
            isSelected ? "border-blue-500 bg-blue-500" : "border-zinc-600 hover:border-zinc-400"
          }`}
        >
          {isSelected && <Check size={10} weight="bold" className="text-white" />}
        </div>
      </div>

      {/* Title + ID + Tags */}
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <span className="shrink-0 font-mono text-[11px] text-zinc-600">{ticket.id}</span>
        <span className="truncate text-[13px] leading-tight text-zinc-200">
          <LinkifiedText>{ticket.title}</LinkifiedText>
        </span>
        {ticket.tags?.length > 0 && (
          <TagList tags={ticket.tags} className="ml-1" />
        )}
      </div>

      {/* Priority */}
      <div className="flex justify-center">
        <PriorityIcon priority={ticket.priority} />
      </div>

      {/* Status — clickable to cycle */}
      <div data-action="status" className="flex cursor-pointer justify-center">
        <StatusDot status={ticket.status} showLabel />
      </div>

      {/* Created */}
      <span className="text-right text-[11px] text-zinc-600">{timeAgo(ticket.created)}</span>
    </div>
  );
});

// ── Helpers for extracting row info from DOM events ───────────

function rowIndexFromEvent(e: React.MouseEvent | MouseEvent): number | null {
  const row = (e.target as HTMLElement).closest("[data-index]") as HTMLElement | null;
  if (!row) return null;
  return parseInt(row.dataset.index!, 10);
}

function actionFromEvent(e: React.MouseEvent | MouseEvent): string | null {
  const el = (e.target as HTMLElement).closest("[data-action]");
  return el?.getAttribute("data-action") ?? null;
}

// ── Main list view ────────────────────────────────────────────

export function ListView() {
  const tickets = useFilteredTickets();
  const highlightIndex = useUIStore((s) => s.highlightIndex);
  const setHighlightIndex = useUIStore((s) => s.setHighlightIndex);
  // Subscribe to selection at the ListView level — passed down to rows
  const selectedIds = useUIStore((s) => s.selectedIds);
  const { activeProjectId } = useProjectStore();
  const { updateTicketStatus } = useTicketStore();
  const [, navigate] = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep latest deps in refs so the interaction engine never goes stale
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const updateStatusRef = useRef(updateTicketStatus);
  updateStatusRef.current = updateTicketStatus;
  const activeProjectRef = useRef(activeProjectId);
  activeProjectRef.current = activeProjectId;

  // State machine — created once, reads deps through refs
  // viewState now only holds contextTargets — selection lives in UIStore
  const [viewState, setViewState] = useState<ListViewState>({
    contextTargets: [],
  });

  const engineRef = useRef<ListInteraction | null>(null);
  if (!engineRef.current) {
    engineRef.current = createListInteraction({
      getTickets: () => ticketsRef.current,
      navigate: (ticketId) => {
        const pid = activeProjectRef.current;
        if (pid) navigateRef.current(`/${pid}/ticket/${ticketId}`);
      },
      cycleStatus: (ticketId, status) => {
        const pid = activeProjectRef.current;
        if (pid) updateStatusRef.current(pid, ticketId, status);
      },
      onChange: setViewState,
      // Selection callbacks — UIStore is the single source of truth
      getSelection: () => useUIStore.getState().selectedIds,
      setSelection: (sel) => useUIStore.setState({ selectedIds: sel }),
      getSelectionAnchor: () => useUIStore.getState().selectionAnchor,
      setSelectionAnchor: (id) => useUIStore.setState({ selectionAnchor: id }),
    });
  }
  const engine = engineRef.current;

  // Scroll suppression for highlight
  const isScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: tickets.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  // Detect scroll to suppress hover highlights
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      isScrolling.current = true;
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        isScrolling.current = false;
      }, 100);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Container event handlers — thin dispatch to engine
  function onMouseDown(e: React.MouseEvent) {
    const idx = rowIndexFromEvent(e);
    if (idx === null) return;
    const action = actionFromEvent(e);
    const result = engine.mousedown(
      idx,
      e.clientX,
      e.clientY,
      {
        shift: e.shiftKey,
        meta: e.metaKey || e.ctrlKey,
      },
      action,
    );
    if (result === "stop") e.stopPropagation();
    if (result === "prevent" || result === "stop") e.preventDefault();
  }

  function onClick(e: React.MouseEvent) {
    const idx = rowIndexFromEvent(e);
    if (idx === null) return;
    const action = actionFromEvent(e);
    const result = engine.click(
      idx,
      {
        shift: e.shiftKey,
        meta: e.metaKey || e.ctrlKey,
      },
      action,
    );
    if (result === "stop") e.stopPropagation();
  }

  function onMouseMove(e: React.MouseEvent) {
    if (isScrolling.current) return;
    const idx = rowIndexFromEvent(e);
    if (idx !== null && engine.canHighlight()) setHighlightIndex(idx);
  }

  function onContextMenu(e: React.MouseEvent) {
    const idx = rowIndexFromEvent(e);
    if (idx !== null) engine.contextmenu(idx);
  }

  // Global mousemove/mouseup during drag — stable, no deps to go stale
  useEffect(() => {
    function onGlobalMousemove(e: MouseEvent) {
      // Auto-scroll near edges
      const container = scrollRef.current;
      if (container && engine.isDragging()) {
        const rect = container.getBoundingClientRect();
        if (e.clientY < rect.top + 40) container.scrollTop -= 8;
        else if (e.clientY > rect.bottom - 40) container.scrollTop += 8;
      }

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const row = el?.closest("[data-index]");
      const idx = row ? parseInt(row.getAttribute("data-index")!, 10) : null;
      engine.globalMousemove(e.clientX, e.clientY, idx);
    }

    function onGlobalMouseup() {
      engine.globalMouseup();
    }

    window.addEventListener("mousemove", onGlobalMousemove);
    window.addEventListener("mouseup", onGlobalMouseup);
    return () => {
      window.removeEventListener("mousemove", onGlobalMousemove);
      window.removeEventListener("mouseup", onGlobalMouseup);
    };
  }, [engine]);

  // Keyboard: Escape + Cmd+A
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") engine.escape();
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "a" &&
        !(e.target as HTMLElement).closest("input,textarea,select")
      ) {
        e.preventDefault();
        engine.selectAll();
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [engine]);

  // Scroll to highlighted row on keyboard nav
  useEffect(() => {
    virtualizer.scrollToIndex(highlightIndex, { align: "auto" });
  }, [highlightIndex, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden select-none">
      {/* Column headers */}
      <div className="grid grid-cols-[20px_28px_1fr_72px_96px_64px] items-center gap-0 border-b border-zinc-800 bg-zinc-950 px-2 py-1.5">
        <div />
        <div />
        <SortHeader field="title" label="Title" />
        <SortHeader field="priority" label="Pri" className="justify-center" />
        <SortHeader field="status" label="Status" className="justify-center" />
        <SortHeader field="created" label="Age" className="justify-end" />
      </div>

      {/* Selection info bar */}
      {selectedIds.size > 0 && (
        <div className="absolute top-full left-0 w-full flex items-center gap-3 border-b border-blue-500/20 bg-blue-500/[0.05] px-4 py-1">
          <span className="text-xs font-medium text-blue-400">{selectedIds.size} selected</span>
          <button
            onClick={() => engine.clear()}
            className="text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Virtual scroll container — wrapped in context menu */}
      <TicketContextMenu targetTickets={viewState.contextTargets}>
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          onMouseDown={onMouseDown}
          onClick={onClick}
          onMouseMove={onMouseMove}
          onContextMenu={onContextMenu}
        >
          {tickets.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-600">
              No tickets match your filters
            </div>
          ) : (
            <div
              className="relative will-change-transform"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualItems.map((vrow) => {
                const ticket = tickets[vrow.index];
                if (!ticket) return null;

                return (
                  <div
                    key={ticket.id}
                    className="absolute left-0 top-0 w-full"
                    style={{ height: ROW_HEIGHT, transform: `translateY(${vrow.start}px)` }}
                  >
                    <ListRow
                      ticket={ticket}
                      index={vrow.index}
                      isHighlighted={vrow.index === highlightIndex}
                      isSelected={selectedIds.has(ticket.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TicketContextMenu>
    </div>
  );
}
