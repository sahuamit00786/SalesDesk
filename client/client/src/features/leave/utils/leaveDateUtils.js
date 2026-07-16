/** Local calendar date as `yyyy-MM-dd` (no UTC shift). */
export function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(`${String(date).slice(0, 10)}T12:00:00`)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayDateKey() {
  return toDateKey(new Date())
}

export function isPastDateKey(dateKey) {
  if (!dateKey) return false
  return String(dateKey).slice(0, 10) < todayDateKey()
}

export function clampDateKeyToMin(dateKey, minKey) {
  const key = String(dateKey || '').slice(0, 10)
  if (!key || key < minKey) return minKey
  return key
}
