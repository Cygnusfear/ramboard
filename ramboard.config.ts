export interface ProjectConfig {
  id: string
  name: string
  path: string
  icon?: string
}

export interface RamboardConfig {
  projects: ProjectConfig[]
  server: {
    port: number
  }
}

const config: RamboardConfig = {
  projects: [
    { id: 'trek', name: 'Trek', path: '~/Projects/project-a' },
    { id: 'bhaktiram', name: 'Bhaktiram', path: '~/Projects/project-b' },
    { id: 'totalrecall', name: 'TotalRecall', path: '~/Projects/project-c' },
    { id: 'pi', name: 'Pi', path: '~/Projects/project-d' },
  ],
  server: {
    port: 4000,
  },
}

export default config
