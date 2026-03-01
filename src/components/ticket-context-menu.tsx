import { useMemo } from 'react'
import { ContextMenu } from '@base-ui/react/context-menu'
import { Menu } from '@base-ui/react/menu'
import {
  Copy, ArrowSquareOut, CaretRight, Minus,
  CircleDashed, ChartBar, ListChecks, Tag, DotsThree, CheckCircle,
} from '@phosphor-icons/react'
import type { TicketSummary } from '@/lib/types'
import { statusOptions, priorityOptions, typeOptions } from '@/lib/ticket-options'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { useNavigate } from '@/hooks/use-navigate'
import { toggleTagForTickets } from '@/lib/tag-mutations'

// ── Shared styles ─────────────────────────────────────────────

export const menuItemCls =
  'flex cursor-default items-center gap-2.5 py-1.5 pr-3 pl-3 text-[13px] leading-4 text-zinc-300 outline-none select-none ' +
  'data-[highlighted]:bg-zinc-800 data-[highlighted]:text-zinc-100'

export const submenuTriggerCls =
  `${menuItemCls} justify-between`

export const menuSeparatorCls = 'mx-2 my-1 h-px bg-zinc-800'

export const menuPopupCls =
  'min-w-[180px] rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl shadow-zinc-950/80 ' +
  'origin-[var(--transform-origin)] transition-opacity data-[ending-style]:opacity-0'

export const kbdCls = 'ml-auto pl-4 font-mono text-[11px] text-zinc-600'

// ── Hook: all menu mutations, self-contained ──────────────────
// No callbacks needed — the menu owns its own store connections.

function useMenuActions() {
  const pid = useProjectStore(s => s.activeProjectId)
  const {
    updateTicketStatus,
    updateTicketPriority,
    updateTicketType,
    updateTicketTags,
  } = useTicketStore()

  return useMemo(() => ({
    setStatus(ids: string[], status: string) {
      if (!pid) return
      for (const id of ids) updateTicketStatus(pid, id, status)
    },
    setPriority(ids: string[], priority: number) {
      if (!pid) return
      for (const id of ids) updateTicketPriority(pid, id, priority)
    },
    setType(ids: string[], type: string) {
      if (!pid) return
      for (const id of ids) updateTicketType(pid, id, type)
    },
    toggleTag(ids: string[], tag: string) {
      if (!pid) return
      const allTickets = useTicketStore.getState().tickets // snapshot, no subscription
      const updates = toggleTagForTickets(allTickets, ids, tag)
      for (const [id, tags] of updates) updateTicketTags(pid, id, tags)
    },
    copyIds(ids: string[]) {
      navigator.clipboard.writeText(ids.join(', '))
    },
  }), [pid, updateTicketStatus, updateTicketPriority, updateTicketType, updateTicketTags])
}

// ── Menu items (shared between ContextMenu and dot Menu) ──────

function MenuContent({
  tickets,
  NS,
  hideOpen,
}: {
  tickets: TicketSummary[]
  NS: typeof ContextMenu | typeof Menu
  hideOpen?: boolean
}) {
  const ids = tickets.map(t => t.id)
  const count = tickets.length
  const single = count === 1 ? tickets[0] : null
  const currentStatus = single?.status
  const currentPriority = single?.priority
  const currentType = single?.type

  const actions = useMenuActions()
  const pid = useProjectStore(s => s.activeProjectId)
  const [, navigate] = useNavigate()

  // All known tags for the Tags submenu
  const allTickets = useTicketStore(s => s.tickets)
  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const t of allTickets) {
      if (Array.isArray(t.tags)) t.tags.forEach(tag => set.add(tag))
    }
    return Array.from(set).sort()
  }, [allTickets])

  // Tag check state for target tickets
  const targetTagSets = useMemo(
    () => tickets.map(t => new Set(t.tags ?? [])),
    [tickets],
  )
  const allHaveTag = (tag: string) => targetTagSets.every(s => s.has(tag))
  const someHaveTag = (tag: string) => !allHaveTag(tag) && targetTagSets.some(s => s.has(tag))

  function handleOpen(ticketId: string) {
    if (pid) navigate(`/${pid}/ticket/${ticketId}`)
  }

  return (
    <>
      {/* Open ticket (single only, hideable) */}
      {single && !hideOpen && (
        <>
          <NS.Item className={menuItemCls} onClick={() => handleOpen(single.id)}>
            <ArrowSquareOut size={14} className="text-zinc-500" />
            Open ticket
            <span className={kbdCls}>Enter</span>
          </NS.Item>
          <NS.Separator className={menuSeparatorCls} />
        </>
      )}

      {/* Status submenu */}
      <NS.SubmenuRoot>
        <NS.SubmenuTrigger className={submenuTriggerCls}>
          <span className="flex items-center gap-2.5">
            <CircleDashed size={14} className="text-zinc-500" />
            Status
          </span>
          <span className="flex items-center gap-1">
            <span className={kbdCls}>S</span>
            <CaretRight size={10} className="text-zinc-600" />
          </span>
        </NS.SubmenuTrigger>
        <NS.Portal>
          <NS.Positioner className="z-50 outline-none" sideOffset={-4} alignOffset={-4}>
            <NS.Popup className={menuPopupCls}>
              {statusOptions.map(opt => (
                <NS.Item
                  key={opt.value}
                  className={menuItemCls}
                  onClick={() => actions.setStatus(ids, opt.value)}
                >
                  <span className="flex w-3.5 items-center justify-center">
                    {currentStatus === opt.value && <CheckCircle size={12} weight="bold" className="text-blue-400" />}
                  </span>
                  {opt.icon}
                  {opt.label}
                </NS.Item>
              ))}
            </NS.Popup>
          </NS.Positioner>
        </NS.Portal>
      </NS.SubmenuRoot>

      {/* Priority submenu */}
      <NS.SubmenuRoot>
        <NS.SubmenuTrigger className={submenuTriggerCls}>
          <span className="flex items-center gap-2.5">
            <ChartBar size={14} className="text-zinc-500" />
            Priority
          </span>
          <span className="flex items-center gap-1">
            <span className={kbdCls}>P</span>
            <CaretRight size={10} className="text-zinc-600" />
          </span>
        </NS.SubmenuTrigger>
        <NS.Portal>
          <NS.Positioner className="z-50 outline-none" sideOffset={-4} alignOffset={-4}>
            <NS.Popup className={menuPopupCls}>
              {priorityOptions.map(opt => (
                <NS.Item
                  key={opt.value}
                  className={menuItemCls}
                  onClick={() => actions.setPriority(ids, opt.value)}
                >
                  <span className="flex w-3.5 items-center justify-center">
                    {currentPriority === opt.value && <CheckCircle size={12} weight="bold" className="text-blue-400" />}
                  </span>
                  {opt.icon}
                  {opt.label}
                </NS.Item>
              ))}
            </NS.Popup>
          </NS.Positioner>
        </NS.Portal>
      </NS.SubmenuRoot>

      {/* Type submenu */}
      <NS.SubmenuRoot>
        <NS.SubmenuTrigger className={submenuTriggerCls}>
          <span className="flex items-center gap-2.5">
            <ListChecks size={14} className="text-zinc-500" />
            Type
          </span>
          <span className="flex items-center gap-1">
            <span className={kbdCls}>T</span>
            <CaretRight size={10} className="text-zinc-600" />
          </span>
        </NS.SubmenuTrigger>
        <NS.Portal>
          <NS.Positioner className="z-50 outline-none" sideOffset={-4} alignOffset={-4}>
            <NS.Popup className={menuPopupCls}>
              {typeOptions.map(opt => (
                <NS.Item
                  key={opt.value}
                  className={menuItemCls}
                  onClick={() => actions.setType(ids, opt.value)}
                >
                  <span className="flex w-3.5 items-center justify-center">
                    {currentType === opt.value && <CheckCircle size={12} weight="bold" className="text-blue-400" />}
                  </span>
                  {opt.icon}
                  {opt.label}
                </NS.Item>
              ))}
            </NS.Popup>
          </NS.Positioner>
        </NS.Portal>
      </NS.SubmenuRoot>

      {/* Tags submenu */}
      <NS.SubmenuRoot>
        <NS.SubmenuTrigger className={submenuTriggerCls}>
          <span className="flex items-center gap-2.5">
            <Tag size={14} className="text-zinc-500" />
            Tags
          </span>
          <span className="flex items-center gap-1">
            <span className={kbdCls}>L</span>
            <CaretRight size={10} className="text-zinc-600" />
          </span>
        </NS.SubmenuTrigger>
        <NS.Portal>
          <NS.Positioner className="z-50 outline-none" sideOffset={-4} alignOffset={-4}>
            <NS.Popup className={`${menuPopupCls} max-h-[320px] overflow-y-auto`}>
              {allTags.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-500">No tags available</div>
              ) : (
                allTags.map(tag => (
                  <NS.Item
                    key={tag}
                    className={menuItemCls}
                    onClick={() => actions.toggleTag(ids, tag)}
                  >
                    <span className="flex w-3.5 items-center justify-center">
                      {allHaveTag(tag) && <CheckCircle size={12} weight="bold" className="text-blue-400" />}
                      {someHaveTag(tag) && <Minus size={12} weight="bold" className="text-zinc-500" />}
                    </span>
                    <span className="text-zinc-300">{tag}</span>
                  </NS.Item>
                ))
              )}
            </NS.Popup>
          </NS.Positioner>
        </NS.Portal>
      </NS.SubmenuRoot>

      <NS.Separator className={menuSeparatorCls} />

      {/* Copy ID */}
      <NS.Item className={menuItemCls} onClick={() => actions.copyIds(ids)}>
        <Copy size={14} className="text-zinc-500" />
        {count > 1 ? `Copy ${count} IDs` : 'Copy ID'}
        <span className={kbdCls}>C</span>
      </NS.Item>
    </>
  )
}

// ── Context menu (right-click wrapper) ────────────────────────
// Zero callback props. Wrap any content — it gets a right-click menu.

interface TicketContextMenuProps {
  children: React.ReactNode
  targetTickets: TicketSummary[]
  triggerClassName?: string
  hideOpen?: boolean
}

export function TicketContextMenu({
  children,
  targetTickets,
  triggerClassName,
  hideOpen,
}: TicketContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<div className={triggerClassName ?? 'flex min-h-0 flex-1 flex-col'} />}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50 outline-none">
          <ContextMenu.Popup className={menuPopupCls}>
            <MenuContent tickets={targetTickets} NS={ContextMenu} hideOpen={hideOpen} />
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

// ── Dot menu button (··· on each row, left-click) ─────────────

export function DotMenu({ ticket }: { ticket: TicketSummary }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex size-5 items-center justify-center rounded text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-300 group-hover/row:opacity-100 data-[popup-open]:opacity-100"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <DotsThree size={14} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" sideOffset={4}>
          <Menu.Popup className={menuPopupCls}>
            <MenuContent tickets={[ticket]} NS={Menu} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
