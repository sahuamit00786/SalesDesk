/** WhatsApp's own menu trigger is three vertical dots — no such icon in our lucide set,
 * so a tiny hand-drawn one instead of adding to the generated icons file. */
export function VerticalDotsIcon({ size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}
