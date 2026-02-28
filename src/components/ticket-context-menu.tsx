import { ContextMenu } from '@base-ui/react/context-menu'
import { Menu } from '@base-ui/react/menu'
import {
  Copy, ArrowSquareOut, CaretRight,
  CircleDashed, ChartBar, Tag, DotsThree, CheckCircle,
} from '@phosphor-icons/react'
import type { TicketSummary } from '@/lib/types'
import { statusOptions, priorityOptions } from '@/lib/ticket-options'

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

// ── Shared menu actions interface ─────────────────────────────

interface MenuActions {
  onSetStatus: (ticketIds: string[], status: string) => void
  onSetPriority: (ticketIds: string[], priority: number) => void
  onCopyId: (ticketIds: string[]) => void
  onOpen: (ticketId: string) => void
}

// ── Menu items (shared between ContextMenu and dot Menu) ──────
// Uses a generic Item/SubmenuRoot/etc. namespace passed in so
// the same content works for both ContextMenu.* and Menu.*

function MenuContent({
  tickets,
  actions,
  NS,
}: {
  tickets: TicketSummary[]
  actions: MenuActions
  NS: typeof ContextMenu | typeof Menu
}) {
  const ids = tickets.map(t => t.id)
  const count = tickets.length
  const single = count === 1 ? tickets[0] : null
  const currentStatus = single?.status
  const currentPriority = single?.priority

  return (
    <>
      {/* Open ticket (single only) */}
      {single && (
        <>
          <NS.Item className={menuItemCls} onClick={() => actions.onOpen(single.id)}>
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
                  onClick={() => actions.onSetStatus(ids, opt.value)}
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
                  onClick={() => actions.onSetPriority(ids, opt.value)}
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

      {/* Labels placeholder */}
      <NS.SubmenuRoot>
        <NS.SubmenuTrigger className={submenuTriggerCls}>
          <span className="flex items-center gap-2.5">
            <Tag size={14} className="text-zinc-500" />
            Labels
          </span>
          <span className="flex items-center gap-1">
            <span className={kbdCls}>L</span>
            <CaretRight size={10} className="text-zinc-600" />
          </span>
        </NS.SubmenuTrigger>
        <NS.Portal>
          <NS.Positioner className="z-50 outline-none" sideOffset={-4} alignOffset={-4}>
            <NS.Popup className={menuPopupCls}>
              <div className="px-3 py-2 text-xs text-zinc-500">Coming soon</div>
            </NS.Popup>
          </NS.Positioner>
        </NS.Portal>
      </NS.SubmenuRoot>

      <NS.Separator className={menuSeparatorCls} />

      {/* Copy ID */}
      <NS.Item className={menuItemCls} onClick={() => actions.onCopyId(ids)}>
        <Copy size={14} className="text-zinc-500" />
        {count > 1 ? `Copy ${count} IDs` : 'Copy ID'}
        <span className={kbdCls}>C</span>
      </NS.Item>
    </>
  )
}

// ── Context menu (right-click on scroll container) ────────────

interface TicketContextMenuProps extends MenuActions {
  children: React.ReactNode
  targetTickets: TicketSummary[]
}

export function TicketContextMenu({
  children,
  targetTickets,
  ...actions
}: TicketContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<div className="flex min-h-0 flex-1 flex-col" />}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50 outline-none">
          <ContextMenu.Popup className={menuPopupCls}>
            <MenuContent tickets={targetTickets} actions={actions} NS={ContextMenu} />
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

// ── Dot menu button (··· on each row, left-click) ─────────────

interface DotMenuProps extends MenuActions {
  ticket: TicketSummary
}

export function DotMenu({ ticket, ...actions }: DotMenuProps) {
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
            <MenuContent tickets={[ticket]} actions={actions} NS={Menu} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
