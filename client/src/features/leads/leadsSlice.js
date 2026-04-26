import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  filters: {
    search: '',
    status: [],
    source: [],
    assignedTo: [],
    scoreMin: 0,
    scoreMax: 100,
    valueMin: null,
    valueMax: null,
    tags: [],
    savedViewId: null,
  },
  sort: { field: 'createdAt', order: 'desc' },
  pagination: { page: 1, limit: 20, total: 0 },
  selected: [],
  viewMode: 'table',
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
      state.filters = initialState.filters
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
  setViewMode,
} = leadsSlice.actions
export default leadsSlice.reducer
