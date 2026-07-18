import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  filters: {
    search: '',
    status: [],
    source: [],
    assignedTo: [],
    scoreMin: null,
    scoreMax: null,
    valueMin: null,
    valueMax: null,
    tags: [],
    savedViewId: null,
    /** Company admin: set to a workspace id to narrow the list; empty = all company workspaces. */
    workspaceId: '',
    /** Advanced query-builder filter tree for GET /leads?filters= */
    filterTree: null,
    stage: [],
    unassignedOnly: false,
  },
  sort: { field: 'updatedAt', order: 'desc' },
  pagination: { page: 1, limit: 20, total: 0 },
  selected: [],
  viewMode: 'table',
  /** Which list variant ('leads' | 'opportunities') currently owns filters/pagination/selection. */
  activeVariant: null,
}

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.page = 1
    },
    resetFilters(state) {
      state.filters = { ...initialState.filters }
      state.pagination.page = 1
    },
    setSort(state, action) {
      state.sort = action.payload
    },
    setPagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload }
    },
    setTotal(state, action) {
      state.pagination.total = action.payload
    },
    setSelected(state, action) {
      state.selected = action.payload
    },
    toggleSelected(state, action) {
      const id = action.payload
      state.selected = state.selected.includes(id) ? state.selected.filter((x) => x !== id) : [...state.selected, id]
    },
    clearSelected(state) {
      state.selected = []
    },
    /**
     * Reset list filters, selection, and page when switching between the leads and
     * opportunities variants. A no-op when re-entering the same variant (e.g. navigating
     * back from a detail page), so pagination position is preserved.
     */
    resetListSession(state, action) {
      const nextVariant = action.payload?.variant ?? null
      if (state.activeVariant === nextVariant) return
      state.activeVariant = nextVariant
      state.filters = { ...initialState.filters }
      state.pagination = { ...initialState.pagination, total: state.pagination.total }
      state.selected = []
    },
    setViewMode(state, action) {
      state.viewMode = action.payload
    },
  },
})

export const {
  setFilters,
  resetFilters,
  setSort,
  setPagination,
  setTotal,
  setSelected,
  toggleSelected,
  clearSelected,
  resetListSession,
  setViewMode,
} = leadsSlice.actions
export default leadsSlice.reducer
