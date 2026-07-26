/** Muted-bell glyph — not in our lucide set, so a small hand-drawn one. */
export function BellOffIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.7 3.7A6 6 0 0 1 18 8v5l1.3 2.5" />
      <path d="M6 8a6 6 0 0 0-1 3.4V13l-2 3h13" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}
