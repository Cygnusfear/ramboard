import { useUIStore } from '@/stores/ui-store'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { X } from '@phosphor-icons/react'

export function BulkActionBar() {
  const { selectedIds, clearSelection } = useUIStore()
  const { updateTicketStatus } = useTicketStore()
  const { activeProjectId } = useProjectStore()

  if (selectedIds.size < 2) return null

  const handleBulkStatus = async (status: string) => {
    if (!activeProjectId) return
    const ids = [...selectedIds]
    for (const id of ids) {
      await updateTicketStatus(activeProjectId, id, status)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center p-4">
      <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 shadow-2xl shadow-zinc-950/80 backdrop-blur-sm">
        <span className="text-sm font-medium text-zinc-300">
          {selectedIds.size} selected
        </span>

        <div className="h-4 w-px bg-zinc-700" />

        <button
          onClick={() => handleBulkStatus('open')}
          className="rounded-md px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
        >
          Open
        </button>
        <button
          onClick={() => handleBulkStatus('in_progress')}
          className="rounded-md px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-amber-400"
        >
          In Progress
        </button>
        <button
          onClick={() => handleBulkStatus('closed')}
          className="rounded-md px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Closed
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        <button
          onClick={clearSelection}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
