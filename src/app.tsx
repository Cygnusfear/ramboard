import { useEffect } from 'react'
import { useProjectStore } from '@/stores/project-store'
import { useTicketStore } from '@/stores/ticket-store'
import { useUIStore } from '@/stores/ui-store'
import { useKeyboard } from '@/hooks/use-keyboard'
import { ProjectRail } from '@/components/project-rail'
import { HeaderBar } from '@/components/header-bar'
import { ListView } from '@/components/list-view'
import { BoardView } from '@/components/board-view'
import { TicketDetail } from '@/components/ticket-detail'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { CommandPalette } from '@/components/command-palette'
import { KeyboardHelp } from '@/components/keyboard-help'

export function App() {
  const { fetchProjects, activeProjectId } = useProjectStore()
  const { fetchTickets, activeTicket, loading } = useTicketStore()
  const { viewMode } = useUIStore()

  useKeyboard()

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Fetch tickets when project changes
  useEffect(() => {
    if (activeProjectId) {
      fetchTickets(activeProjectId)
    }
  }, [activeProjectId, fetchTickets])

  return (
    <div className="flex min-h-[100dvh]">
      <ProjectRail />

      <div className="flex flex-1 flex-col">
        {activeTicket ? (
          <TicketDetail />
        ) : (
          <>
            <HeaderBar />
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-sm text-zinc-500">Loading tickets...</div>
              </div>
            ) : viewMode === 'list' ? (
              <ListView />
            ) : (
              <BoardView />
            )}
          </>
        )}
      </div>

      <BulkActionBar />
      <CommandPalette />
      <KeyboardHelp />
    </div>
  )
}
