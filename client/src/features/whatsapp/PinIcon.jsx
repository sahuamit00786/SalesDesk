/** Thumbtack/pin glyph — not in our lucide set, so a small hand-drawn one. */
export function PinIcon({ size = 14, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 3h6l1 6 3 3v2H5v-2l3-3z" />
    </svg>
  )
}
