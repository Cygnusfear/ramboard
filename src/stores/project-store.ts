import { create } from 'zustand'
import type { ProjectSummary } from '@/lib/types'
import { getProjects } from '@/lib/api'

interface ProjectState {
  projects: ProjectSummary[]
  activeProjectId: string | null
  loading: boolean
  fetchProjects: () => Promise<void>
  setActiveProject: (id: string) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    try {
      const projects = await getProjects()
      const current = get().activeProjectId
      set({
        projects,
        loading: false,
        activeProjectId: current || projects[0]?.id || null,
      })
    } catch (e) {
      console.error('Failed to fetch projects:', e)
      set({ loading: false })
    }
  },

  setActiveProject: (id) => set({ activeProjectId: id }),
}))
