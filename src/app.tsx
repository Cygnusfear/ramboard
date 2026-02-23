import { useEffect } from 'react'
import { Route, Switch, Redirect, useRoute, useLocation } from 'wouter'
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

/** Redirect `/` to the first project once loaded */
function RootRedirect() {
  const { projects, loading } = useProjectStore()
  if (loading || projects.length === 0) return null
  return <Redirect to={`/${projects[0].id}`} />
}

/** Syncs route params → stores */
function ProjectView() {
  const [, params] = useRoute('/:projectId')
  const projectId = params?.projectId ?? null
  const { fetchTickets, clearActiveTicket, loading } = useTicketStore()
  const { setActiveProject, activeProjectId } = useProjectStore()
  const { viewMode } = useUIStore()

  useEffect(() => {
    // Clear ticket detail when navigating to list view
    clearActiveTicket()
    if (projectId && projectId !== activeProjectId) {
      setActiveProject(projectId)
    }
  }, [projectId, activeProjectId, setActiveProject, clearActiveTicket])

  useEffect(() => {
    if (projectId) fetchTickets(projectId)
  }, [projectId, fetchTickets])

  return (
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
  )
}

function TicketDetailView() {
  const [, params] = useRoute('/:projectId/ticket/:ticketId')
  const projectId = params?.projectId ?? null
  const ticketId = params?.ticketId ?? null
  const { fetchTicketDetail, activeTicket } = useTicketStore()
  const { setActiveProject } = useProjectStore()

  useEffect(() => {
    if (projectId) setActiveProject(projectId)
  }, [projectId, setActiveProject])

  useEffect(() => {
    if (projectId && ticketId) {
      // Only fetch if we don't already have this ticket loaded
      if (!activeTicket || activeTicket.id !== ticketId) {
        fetchTicketDetail(projectId, ticketId)
      }
    }
  }, [projectId, ticketId, activeTicket, fetchTicketDetail])

  return <TicketDetail />
}

export function App() {
  const { fetchProjects } = useProjectStore()

  useKeyboard()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="flex h-[100dvh]">
      <ProjectRail />

      <div className="relative flex flex-1 flex-col">
        <Switch>
          <Route path="/:projectId/ticket/:ticketId" component={TicketDetailView} />
          <Route path="/:projectId" component={ProjectView} />
          <Route path="/" component={RootRedirect} />
        </Switch>
      </div>

      <BulkActionBar />
      <CommandPalette />
      <KeyboardHelp />
    </div>
  )
}
