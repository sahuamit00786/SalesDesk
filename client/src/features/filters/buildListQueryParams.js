import { serializeFilterTree } from './filterUtils'

/**
 * Build RTK query params for GET /leads from Redux filter state.
 */
export function buildLeadsListQueryParams({ filters, sort, pagination, isOpportunity }) {
  const params = {
    page: pagination.page,
    limit: pagination.limit,
    sort: sort.field,
    order: sort.order,
  }

  params.isOpportunity = isOpportunity ? true : false

  if (filters.workspaceId) params.workspaceId = filters.workspaceId
  if (filters.search?.trim()) params.search = filters.search.trim()

  if (filters.status?.length) params.status = filters.status.join(',')
  if (filters.source?.length) params.source = filters.source.join(',')
  if (filters.assignedTo?.length) params.assignedTo = filters.assignedTo.join(',')
  if (filters.unassignedOnly) params.unassignedOnly = true
  if (filters.scoreMin != null && filters.scoreMin !== '') params.scoreMin = filters.scoreMin
  if (filters.scoreMax != null && filters.scoreMax !== '') params.scoreMax = filters.scoreMax
  if (filters.valueMin != null) params.valueMin = filters.valueMin
  if (filters.valueMax != null) params.valueMax = filters.valueMax
  if (filters.stage?.length) params.stage = filters.stage.join(',')

  const filtersJson = serializeFilterTree(filters.filterTree)
  if (filtersJson) params.filters = filtersJson

  return params
}
