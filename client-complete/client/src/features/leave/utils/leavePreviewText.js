/** Human-readable working-days preview from /leave/preview-days response. */
export function formatLeaveDaysPreview(data) {
  if (!data || data.days == null) return null
  const n = Number(data.days)
  let text = `${n} working day${n === 1 ? '' : 's'}`
  const excluded = []
  const weekly = Number(data.weeklyOffDays || 0)
  const holidays = Number(data.publicHolidays || 0)
  if (weekly > 0) excluded.push(`${weekly} weekly off`)
  if (holidays > 0) excluded.push(`${holidays} public holiday${holidays === 1 ? '' : 's'}`)
  if (excluded.length) text += ` (${excluded.join(', ')} excluded)`
  return text
}
