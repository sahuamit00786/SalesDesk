/** Append 2-digit hex alpha to #RRGGBB */
export function hexWithAlpha(hex, alpha01) {
  if (!hex || typeof hex !== 'string') return undefined
  const h = hex.trim()
  if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return undefined
  const a = Math.round(Math.min(1, Math.max(0, alpha01)) * 255)
  const aa = a.toString(16).padStart(2, '0')
  return `${h}${aa}`
}
