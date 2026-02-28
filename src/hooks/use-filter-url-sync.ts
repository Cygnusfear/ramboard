import { useEffect, useRef } from 'react'
import { useSearch, useLocation } from 'wouter'
import { useFilterStore } from '@/stores/filter-store'
import type { FilterSet } from '@/lib/filter-engine'
import type { SortField, SortDir } from '@/lib/types'

/**
 * Serialize filter state to URL search string.
 * Only includes non-default values to keep URLs clean.
 */
function serializeToSearch(state: {
  filters: FilterSet
  search: string
  sortField: SortField
  sortDir: SortDir
}): string {
  const params = new URLSearchParams()

  if (state.filters.length > 0) {
    params.set('f', JSON.stringify(state.filters))
  }
  if (state.search) {
    params.set('q', state.search)
  }
  if (state.sortField !== 'priority') {
    params.set('sf', state.sortField)
  }
  if (state.sortDir !== 'asc') {
    params.set('sd', state.sortDir)
  }

  const str = params.toString()
  return str ? `?${str}` : ''
}

/**
 * Deserialize URL search string to filter state.
 * Returns null if nothing relevant found in URL.
 */
function deserializeFromSearch(search: string): Partial<{
  filters: FilterSet
  search: string
  sortField: SortField
  sortDir: SortDir
}> | null {
  if (!search) return null
  const params = new URLSearchParams(search)

  // Only restore if URL actually has filter params
  if (!params.has('f') && !params.has('q') && !params.has('sf') && !params.has('sd')) {
    return null
  }

  const result: Partial<{
    filters: FilterSet
    search: string
    sortField: SortField
    sortDir: SortDir
  }> = {}

  const filtersRaw = params.get('f')
  if (filtersRaw) {
    try { result.filters = JSON.parse(filtersRaw) } catch { /* ignore */ }
  }
  if (params.has('q')) result.search = params.get('q')!
  if (params.has('sf')) result.sortField = params.get('sf') as SortField
  if (params.has('sd')) result.sortDir = params.get('sd') as SortDir

  return result
}

/** Last known filter search string — survives navigation to ticket detail */
let lastFilterSearch = ''

/** Get the last filter search string (for "Back" navigation) */
export function getLastFilterSearch(): string {
  return lastFilterSearch
}

/**
 * Two-way sync between filter store and URL search params.
 *
 * - On mount: restores filters from URL if present
 * - On filter change: updates URL via replaceState
 * - On back/forward: restores from URL
 */
export function useFilterUrlSync() {
  const searchString = useSearch()
  const [location] = useLocation()
  const initialized = useRef(false)
  const skipNextUrlUpdate = useRef(false)

  // On mount / URL change: restore filters from URL
  useEffect(() => {
    const restored = deserializeFromSearch(searchString)
    if (restored) {
      skipNextUrlUpdate.current = true
      useFilterStore.setState(restored)
      lastFilterSearch = searchString
    }
    initialized.current = true
  }, [searchString])

  // On filter state change: push to URL
  useEffect(() => {
    if (!initialized.current) return

    const unsub = useFilterStore.subscribe((state) => {
      if (skipNextUrlUpdate.current) {
        skipNextUrlUpdate.current = false
        return
      }

      const search = serializeToSearch(state)
      lastFilterSearch = search ? search.slice(1) : '' // strip leading ?

      // Only update URL if we're on a list/board/graph page (not ticket detail)
      if (location.includes('/ticket/')) return

      const pathWithoutSearch = location.split('?')[0]
      const newUrl = pathWithoutSearch + search
      window.history.replaceState(null, '', newUrl)
    })

    return unsub
  }, [location])
}
