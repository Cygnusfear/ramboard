import { useEffect } from 'react'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { useViewStore } from '@/stores/view-store'
import { useFilterStore } from '@/stores/filter-store'

/** Core project view — handles data loading + view resolution */
export function useProjectViewSetup(projectId: string | null, viewId: string | null) {
  const { fetchTickets, clearActiveTicket, loading } = useTicketStore()
  const { setActiveProject, activeProjectId } = useProjectStore()
  const { fetchViews, views, activeViewId, setActiveView } = useViewStore()

  const activeView = views.find(v => v.id === activeViewId)
  const viewMode = activeView?.mode ?? 'list'

  // Subscribe to filter changes → mark active view dirty so it can be saved
  useEffect(() => {
    const unsub = useFilterStore.subscribe(() => {
      useViewStore.getState().markDirty()
    })
    return unsub
  }, [])

  useEffect(() => {
    clearActiveTicket()
    if (projectId && projectId !== activeProjectId) {
      setActiveProject(projectId)
    }
  }, [projectId, activeProjectId, setActiveProject, clearActiveTicket])

  useEffect(() => {
    if (projectId) {
      fetchTickets(projectId)
      fetchViews(projectId)
    }
  }, [projectId, fetchTickets, fetchViews])

  // Sync URL viewId → store (only after views are loaded)
  useEffect(() => {
    if (viewId && views.length > 0 && activeViewId !== viewId) {
      const exists = views.find(v => v.id === viewId)
      if (exists) setActiveView(viewId)
    }
  }, [viewId, views, activeViewId, setActiveView])

  // When active view changes, load its saved filters + groupBy into filter store
  useEffect(() => {
    if (activeView?.mode === 'list' && activeView.list) {
      const { filters, sortField, sortDir, groupBy } = activeView.list
      useFilterStore.setState({ filters, sortField, sortDir, groupBy: groupBy ?? null })
      useViewStore.getState().markClean()
    }
  }, [activeViewId, activeView])

  return { loading, viewMode }
}
