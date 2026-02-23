import { useProjectStore } from '@/stores/project-store'
import { Gear } from '@phosphor-icons/react'

export function ProjectRail() {
  const { projects, activeProjectId, setActiveProject } = useProjectStore()

  return (
    <nav className="flex h-full w-14 flex-col items-center gap-2 border-r border-zinc-800 bg-zinc-950 py-3">
      {projects.map((project, idx) => {
        const isActive = project.id === activeProjectId
        return (
          <div key={project.id} className="group relative">
            {/* Active pill indicator */}
            {isActive && (
              <div className="absolute -left-0.5 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-full bg-blue-500" />
            )}

            <button
              onClick={() => setActiveProject(project.id)}
              title={project.name}
              className={`flex size-10 items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 hover:scale-105'
              }`}
            >
              {project.name[0].toUpperCase()}
            </button>

            {/* Tooltip */}
            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              <span>{project.name}</span>
              <span className="ml-2 text-zinc-500">{idx + 1}</span>
            </div>
          </div>
        )
      })}

      <div className="mt-auto">
        <button
          className="flex size-10 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="Settings"
        >
          <Gear size={18} />
        </button>
      </div>
    </nav>
  )
}
