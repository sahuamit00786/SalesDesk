/** Human-readable deal id suffix (matches deal pipeline / detail panel). */
export function shortDealId(entity) {
  if (!entity?.id) return '—'
  const digits = String(entity.id).replace(/\D/g, '')
  if (digits.length >= 6) return digits.slice(-6)
  let n = 0
  for (const c of String(entity.id)) n = (n * 31 + c.charCodeAt(0)) >>> 0
  return String(n % 1000000).padStart(6, '0')
}
