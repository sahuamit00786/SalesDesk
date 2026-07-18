/** @param {string | Date | null | undefined} value */
export function toCampaignDateInputValue(value) {
  if (!value) return ''
  const raw = typeof value === 'string' ? value.slice(0, 10) : ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** @param {string | Date | null | undefined} value */
export function formatCampaignEndDate(value) {
  const input = toCampaignDateInputValue(value)
  if (!input) return null
  const d = new Date(`${input}T12:00:00`)
  if (Number.isNaN(d.getTime())) return input
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
