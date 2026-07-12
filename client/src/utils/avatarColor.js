const PALETTE = [
  { bg: '#FEE2E2', text: '#B91C1C' },
  { bg: '#FFEDD5', text: '#C2410C' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#ECFCCB', text: '#4D7C0F' },
  { bg: '#D1FAE5', text: '#047857' },
  { bg: '#CFFAFE', text: '#0E7490' },
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#E0E7FF', text: '#4338CA' },
  { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#F1F5F9', text: '#334155' },
]

/** Deterministic color for a person, keyed by email (preferred) or name, stable across renders. */
export function getAvatarColor(seed) {
  const s = String(seed || '').trim().toLowerCase()
  if (!s) return PALETTE[PALETTE.length - 1]
  let hash = 0
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
