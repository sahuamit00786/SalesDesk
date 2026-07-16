/** Accepts true / 1 / yes / on (case-insensitive, trimmed). */
export function envTruthy(key, defaultValue = false) {
  const v = process.env[key]
  if (v == null || String(v).trim() === '') return defaultValue
  const s = String(v).trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(s)
}
