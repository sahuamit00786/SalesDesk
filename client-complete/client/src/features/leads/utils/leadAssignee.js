/** Normalize list/API payloads to a plain lead array. */
export function coerceToLeadArray(value) {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value.data)) return value.data
  if (Array.isArray(value.rows)) return value.rows
  if (Array.isArray(value.items)) return value.items
  if (value.data && typeof value.data === 'object') {
    if (Array.isArray(value.data.rows)) return value.data.rows
    if (Array.isArray(value.data.items)) return value.data.items
    if (value.data.id) return [value.data]
  }
  if (value.id) return [value]
  return []
}

export function formatLeadAssignees(lead) {
  const names = []
  if (Array.isArray(lead?.assignedUsers) && lead.assignedUsers.length) {
    for (const u of lead.assignedUsers) {
      const label = u?.name || u?.email
      if (label) names.push(label)
    }
  } else if (lead?.assignee?.name || lead?.assignee?.email) {
    names.push(lead.assignee.name || lead.assignee.email)
  }
  return names.length ? names.join(', ') : 'Unassigned'
}

export function leadListLabel(lead) {
  return lead?.contactName || lead?.title || lead?.company || lead?.email || 'Unnamed'
}
