import { useEffect } from 'react'
import { Route, Switch, Redirect, useRoute } from 'wouter'
import { useProjectStore } from '@/stores/project-store'
import { useTicketStore } from '@/stores/ticket-store'
import { useKeyboard } from '@/hooks/use-keyboard'
import { useFilterUrlSync } from '@/hooks/use-filter-url-sync'
import { useProjectViewSetup } from '@/hooks/use-project-view-setup'
import { ProjectRail } from '@/components/project-rail'
import { HeaderBar } from '@/components/header-bar'
import { ListView } from '@/components/list-view'
import { BoardView } from '@/components/board-view'
import { GraphView } from '@/components/graph-view'
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
function ViewContent({ viewMode, loading }: { viewMode: string; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-zinc-500">Loading tickets...</div>
      </div>
    )
  }
  if (viewMode === 'graph') return <GraphView />
  if (viewMode === 'board') return <BoardView />
  return <ListView />
}

function ProjectView() {
  const [, params] = useRoute('/:projectId')
  const projectId = params?.projectId ?? null
  const { loading, viewMode } = useProjectViewSetup(projectId, null)

  return (
    <>
      <HeaderBar />
      <ViewContent viewMode={viewMode} loading={loading} />
    </>
  )
}

/** Route: /:projectId/view/:viewId — deep-links to a specific view */
function ProjectViewWithViewId() {
  const [, params] = useRoute('/:projectId/view/:viewId')
  const projectId = params?.projectId ?? null
  const viewId = params?.viewId ?? null
  const { loading, viewMode } = useProjectViewSetup(projectId, viewId)

  return (
    <>
      <HeaderBar />
      <ViewContent viewMode={viewMode} loading={loading} />
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
  useFilterUrlSync()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <ProjectRail />

      <div className="relative flex min-w-0 flex-1 flex-col" style={{ viewTransitionName: 'content' }}>
        <Switch>
          <Route path="/:projectId/ticket/:ticketId" component={TicketDetailView} />
          <Route path="/:projectId/view/:viewId" component={ProjectViewWithViewId} />
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
