import { ContextMenu } from '@base-ui/react/context-menu'
import { Menu } from '@base-ui/react/menu'
import {
  Circle, CircleHalf, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Minus, ArrowFatDown,
  Copy, ArrowSquareOut, CaretRight,
  CircleDashed, ChartBar, Tag, DotsThree,
} from '@phosphor-icons/react'
import type { TicketSummary } from '@/lib/types'

// ── Shared styles ─────────────────────────────────────────────

const itemCls =
  'flex cursor-default items-center gap-2.5 py-1.5 pr-3 pl-3 text-[13px] leading-4 text-zinc-300 outline-none select-none ' +
  'data-[highlighted]:bg-zinc-800 data-[highlighted]:text-zinc-100'

const submenuTriggerCls =
  `${itemCls} justify-between`

const separatorCls = 'mx-2 my-1 h-px bg-zinc-800'

const popupCls =
  'min-w-[180px] rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl shadow-zinc-950/80 ' +
  'origin-[var(--transform-origin)] transition-opacity data-[ending-style]:opacity-0'

const kbdCls = 'ml-auto pl-4 font-mono text-[11px] text-zinc-600'

// ── Status & priority options ─────────────────────────────────

const statusOptions = [
  { value: 'open', label: 'Open', icon: <Circle size={14} weight="bold" className="text-emerald-400" />, key: '1' },
  { value: 'in_progress', label: 'In Progress', icon: <CircleHalf size={14} weight="bold" className="text-amber-400" />, key: '2' },
  { value: 'closed', label: 'Closed', icon: <CheckCircle size={14} weight="bold" className="text-zinc-400" />, key: '3' },
  { value: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} weight="bold" className="text-zinc-600" />, key: '4' },
]

const priorityOptions = [
  { value: 0, label: 'Urgent', icon: <ArrowFatDown size={14} weight="fill" className="rotate-180 text-red-400" />, key: '1' },
  { value: 1, label: 'High', icon: <ArrowUp size={14} weight="bold" className="text-orange-400" />, key: '2' },
  { value: 2, label: 'Medium', icon: <Minus size={14} className="text-zinc-400" />, key: '3' },
  { value: 3, label: 'Low', icon: <ArrowDown size={14} weight="bold" className="text-blue-400" />, key: '4' },
]

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
          <NS.Item className={itemCls} onSelect={() => actions.onOpen(single.id)}>
            <ArrowSquareOut size={14} className="text-zinc-500" />
            Open ticket
            <span className={kbdCls}>Enter</span>
          </NS.Item>
          <NS.Separator className={separatorCls} />
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
            <NS.Popup className={popupCls}>
              {statusOptions.map(opt => (
                <NS.Item
                  key={opt.value}
                  className={itemCls}
                  onSelect={() => actions.onSetStatus(ids, opt.value)}
                >
                  <span className="flex w-3.5 items-center justify-center">
                    {currentStatus === opt.value && <CheckCircle size={12} weight="bold" className="text-blue-400" />}
                  </span>
                  {opt.icon}
                  {opt.label}
                  <span className={kbdCls}>{opt.key}</span>
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
            <NS.Popup className={popupCls}>
              {priorityOptions.map(opt => (
                <NS.Item
                  key={opt.value}
                  className={itemCls}
                  onSelect={() => actions.onSetPriority(ids, opt.value)}
                >
                  <span className="flex w-3.5 items-center justify-center">
                    {currentPriority === opt.value && <CheckCircle size={12} weight="bold" className="text-blue-400" />}
                  </span>
                  {opt.icon}
                  {opt.label}
                  <span className={kbdCls}>{opt.key}</span>
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
            <NS.Popup className={popupCls}>
              <div className="px-3 py-2 text-xs text-zinc-500">Coming soon</div>
            </NS.Popup>
          </NS.Positioner>
        </NS.Portal>
      </NS.SubmenuRoot>

      <NS.Separator className={separatorCls} />

      {/* Copy ID */}
      <NS.Item className={itemCls} onSelect={() => actions.onCopyId(ids)}>
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
          <ContextMenu.Popup className={popupCls}>
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
          <Menu.Popup className={popupCls}>
            <MenuContent tickets={[ticket]} actions={actions} NS={Menu} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
