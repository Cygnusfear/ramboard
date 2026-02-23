import { useUIStore } from '@/stores/ui-store'
import { useFilterStore } from '@/stores/filter-store'
import { useViewStore } from '@/stores/view-store'
import { useFilteredTickets } from '@/hooks/use-filtered-tickets'
import { useTicketStore } from '@/stores/ticket-store'
import { useProjectStore } from '@/stores/project-store'
import { FilterBar } from './filter-bar'
import { List, Kanban, FloppyDisk, CaretDown } from '@phosphor-icons/react'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { Popover } from '@base-ui/react/popover'

export function HeaderBar() {
  const { setShowCommandPalette } = useUIStore()
  const { views, activeViewId, setActiveView, dirty, saveView, markClean } = useViewStore()
  const { activeProjectId } = useProjectStore()
  const filtered = useFilteredTickets()
  const total = useTicketStore(s => s.tickets.length)
  const hasFilters = useFilterStore(s => s.filters.length > 0 || s.search.length > 0)

  const activeView = views.find(v => v.id === activeViewId)
  const viewMode = activeView?.mode ?? 'list'

  // Toggle between first list view and first board view
  const handleModeToggle = (values: string[]) => {
    if (values.length === 0) return
    const targetMode = values[0] as 'list' | 'board'
    if (targetMode === viewMode) return
    const target = views.find(v => v.mode === targetMode)
    if (target) setActiveView(target.id)
  }

  // Save current filters back to active view
  const handleSave = async () => {
    if (!activeProjectId || !activeView) return
    const { filters, sortField, sortDir } = useFilterStore.getState()
    const updated = {
      ...activeView,
      list: activeView.mode === 'list' ? { ...activeView.list!, filters, sortField, sortDir } : activeView.list,
    }
    await saveView(activeProjectId, updated)
  }

  return (
    <header className="relative z-20 border-b border-zinc-800">
      <div className="flex h-11 items-center gap-3 px-4">
        {/* View toggle */}
        <ToggleGroup
          value={[viewMode]}
          onValueChange={handleModeToggle}
          className="flex rounded-lg border border-zinc-800 p-0.5"
        >
          <Toggle
            value="list"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300 data-[pressed]:bg-zinc-800 data-[pressed]:text-zinc-100"
          >
            <List size={14} />
            List
          </Toggle>
          <Toggle
            value="board"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300 data-[pressed]:bg-zinc-800 data-[pressed]:text-zinc-100"
          >
            <Kanban size={14} />
            Board
          </Toggle>
        </ToggleGroup>

        {/* View picker */}
        <Popover.Root>
          <Popover.Trigger className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200">
            <span className="max-w-[120px] truncate">{activeView?.name ?? 'Default'}</span>
            {dirty && <span className="size-1.5 rounded-full bg-blue-500" />}
            <CaretDown size={10} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} className="z-50">
              <Popover.Popup className="min-w-[200px] rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-xl shadow-zinc-950/80">
                {views.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setActiveView(v.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-zinc-800 ${
                      v.id === activeViewId ? 'text-zinc-100' : 'text-zinc-400'
                    }`}
                  >
                    {v.mode === 'list' ? <List size={12} /> : <Kanban size={12} />}
                    {v.name}
                    {v.id === activeViewId && <span className="ml-auto text-blue-400">●</span>}
                  </button>
                ))}
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        {/* Save button (shown when dirty) */}
        {dirty && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/20"
          >
            <FloppyDisk size={12} />
            Save
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {hasFilters ? `${filtered.length} of ${total}` : `${total} tickets`}
          </span>

          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-300"
          >
            <kbd className="font-mono text-[10px] text-zinc-600">⌘K</kbd>
          </button>
        </div>
      </div>

      {/* Filter bar (list mode only) */}
      {viewMode === 'list' && <FilterBar />}
    </header>
  )
}
