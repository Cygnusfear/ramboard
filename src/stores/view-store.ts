import { create } from 'zustand'
import type { SavedView } from '@/lib/types'

interface ViewState {
  views: SavedView[]
  activeViewId: string | null
  dirty: boolean
  loading: boolean

  fetchViews: (projectId: string) => Promise<void>
  saveView: (projectId: string, view: Omit<SavedView, 'id'> & { id?: string }) => Promise<SavedView>
  deleteView: (projectId: string, viewId: string) => Promise<void>
  setActiveView: (viewId: string) => void
  markDirty: () => void
  markClean: () => void
}

export const useViewStore = create<ViewState>((set, get) => ({
  views: [],
  activeViewId: null,
  dirty: false,
  loading: false,

  fetchViews: async (projectId) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/projects/${projectId}/views`)
      const views: SavedView[] = await res.json()
      const current = get().activeViewId
      set({
        views,
        loading: false,
        // Keep active if still exists, else default to first
        activeViewId: views.find(v => v.id === current) ? current : views[0]?.id ?? null,
        dirty: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  saveView: async (projectId, view) => {
    const isUpdate = view.id && get().views.some(v => v.id === view.id)
    const method = isUpdate ? 'PUT' : 'POST'
    const url = isUpdate
      ? `/api/projects/${projectId}/views/${view.id}`
      : `/api/projects/${projectId}/views`

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(view),
    })
    const saved: SavedView = await res.json()

    set(s => ({
      views: isUpdate
        ? s.views.map(v => v.id === saved.id ? saved : v)
        : [...s.views, saved],
      activeViewId: saved.id,
      dirty: false,
    }))
    return saved
  },

  deleteView: async (projectId, viewId) => {
    await fetch(`/api/projects/${projectId}/views/${viewId}`, { method: 'DELETE' })
    set(s => {
      const views = s.views.filter(v => v.id !== viewId)
      return {
        views,
        activeViewId: s.activeViewId === viewId ? (views[0]?.id ?? null) : s.activeViewId,
      }
    })
  },

  setActiveView: (viewId) => set({ activeViewId: viewId, dirty: false }),
  markDirty: () => set({ dirty: true }),
  markClean: () => set({ dirty: false }),
}))
