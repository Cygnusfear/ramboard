import { ContextMenu } from '@base-ui/react/context-menu'
import {
  Circle, CircleHalf, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Minus, ArrowFatDown,
  Copy, ArrowSquareOut,
} from '@phosphor-icons/react'
import type { TicketSummary } from '@/lib/types'

// ── Shared Tailwind classes ───────────────────────────────────

const itemCls =
  'flex cursor-default items-center gap-2 py-1.5 pr-8 pl-3 text-[13px] leading-4 text-zinc-300 outline-none select-none ' +
  'data-[highlighted]:relative data-[highlighted]:z-0 data-[highlighted]:text-zinc-50 ' +
  'data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 ' +
  'data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-sm data-[highlighted]:before:bg-zinc-700'

const separatorCls = 'mx-3 my-1 h-px bg-zinc-800'
const labelCls = 'px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-500 select-none'

// ── Status & priority icons ───────────────────────────────────

const statusOptions = [
  { value: 'open', label: 'Open', icon: <Circle size={14} className="text-emerald-400" /> },
  { value: 'in_progress', label: 'In Progress', icon: <CircleHalf size={14} className="text-amber-400" /> },
  { value: 'closed', label: 'Closed', icon: <CheckCircle size={14} className="text-zinc-400" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} className="text-zinc-600" /> },
]

const priorityOptions = [
  { value: 0, label: 'Urgent', icon: <ArrowFatDown size={14} weight="fill" className="rotate-180 text-red-400" /> },
  { value: 1, label: 'High', icon: <ArrowUp size={14} weight="bold" className="text-orange-400" /> },
  { value: 2, label: 'Medium', icon: <Minus size={14} className="text-zinc-400" /> },
  { value: 3, label: 'Low', icon: <ArrowDown size={14} weight="bold" className="text-blue-400" /> },
]

// ── Props ─────────────────────────────────────────────────────

interface TicketContextMenuProps {
  children: React.ReactNode
  /** The ticket(s) that this context menu applies to */
  targetTickets: TicketSummary[]
  onSetStatus: (ticketIds: string[], status: string) => void
  onSetPriority: (ticketIds: string[], priority: number) => void
  onCopyId: (ticketIds: string[]) => void
  onOpen: (ticketId: string) => void
}

export function TicketContextMenu({
  children,
  targetTickets,
  onSetStatus,
  onSetPriority,
  onCopyId,
  onOpen,
}: TicketContextMenuProps) {
  const ids = targetTickets.map(t => t.id)
  const count = targetTickets.length
  const single = count === 1 ? targetTickets[0] : null

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={<div className="flex flex-1 flex-col overflow-hidden" />}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50 outline-none">
          <ContextMenu.Popup className="min-w-[180px] origin-[var(--transform-origin)] rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl shadow-zinc-950/80 transition-opacity data-[ending-style]:opacity-0">

            {/* Open ticket (single only) */}
            {single && (
              <>
                <ContextMenu.Item
                  className={itemCls}
                  onSelect={() => onOpen(single.id)}
                >
                  <ArrowSquareOut size={14} className="text-zinc-400" />
                  Open ticket
                </ContextMenu.Item>
                <ContextMenu.Separator className={separatorCls} />
              </>
            )}

            {/* Set status */}
            <div className={labelCls}>
              {count > 1 ? `Set status (${count})` : 'Set status'}
            </div>
            {statusOptions.map(opt => (
              <ContextMenu.Item
                key={opt.value}
                className={itemCls}
                onSelect={() => onSetStatus(ids, opt.value)}
              >
                {opt.icon}
                {opt.label}
              </ContextMenu.Item>
            ))}

            <ContextMenu.Separator className={separatorCls} />

            {/* Set priority */}
            <div className={labelCls}>
              {count > 1 ? `Set priority (${count})` : 'Set priority'}
            </div>
            {priorityOptions.map(opt => (
              <ContextMenu.Item
                key={opt.value}
                className={itemCls}
                onSelect={() => onSetPriority(ids, opt.value)}
              >
                {opt.icon}
                {opt.label}
              </ContextMenu.Item>
            ))}

            <ContextMenu.Separator className={separatorCls} />

            {/* Copy ID */}
            <ContextMenu.Item
              className={itemCls}
              onSelect={() => onCopyId(ids)}
            >
              <Copy size={14} className="text-zinc-400" />
              {count > 1 ? `Copy ${count} IDs` : `Copy ID`}
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
