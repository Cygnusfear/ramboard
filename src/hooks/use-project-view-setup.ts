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

  // When active view changes, load its filters into filter store (list mode)
  // Skip if URL already has filter params (URL takes priority over saved view)
  useEffect(() => {
    if (activeView?.mode === 'list' && activeView.list) {
      const hasUrlFilters = window.location.search.includes('f=') || window.location.search.includes('q=')
        || window.location.search.includes('sf=') || window.location.search.includes('sd=')
      if (hasUrlFilters) {
        useViewStore.getState().markClean()
        return
      }
      const { filters, sortField, sortDir } = activeView.list
      useFilterStore.setState({ filters, sortField, sortDir })
      useViewStore.getState().markClean()
    }
  }, [activeViewId, activeView])

  return { loading, viewMode }
}
