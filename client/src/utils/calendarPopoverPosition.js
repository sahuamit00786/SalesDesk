/**
 * Position fixed calendar event popovers so they stay fully in the viewport.
 * @param {DOMRect | { top: number, left: number, right: number, bottom: number, width: number, height: number }} anchorRect
 */
export function computeCalendarPopoverPosition(anchorRect) {
  const M = 12
  if (!anchorRect) return { top: 0, left: 0, maxCardHeight: 640 }
  const cardW = Math.min(420, window.innerWidth - 2 * M)
  const preferredMaxH = Math.min(640, window.innerHeight * 0.82)

  const spaceBelow = window.innerHeight - anchorRect.bottom - M
  const spaceAbove = anchorRect.top - M

  // Anchor whichever edge of the card actually sits next to the event: `top` when
  // opening below, `bottom` when opening above. Anchoring the "above" case by a
  // computed `top` (using the max-height budget) leaves a gap once the card's real
  // content height renders shorter than that budget — `bottom` pins the card's
  // bottom edge to the anchor regardless of how tall the card actually ends up.
  let top
  let bottom
  let maxCardHeight
  if (spaceBelow >= spaceAbove) {
    top = anchorRect.bottom + M
    maxCardHeight = Math.max(1, Math.min(preferredMaxH, spaceBelow))
  } else {
    bottom = window.innerHeight - anchorRect.top + M
    maxCardHeight = Math.max(1, Math.min(preferredMaxH, spaceAbove))
  }

  let x = anchorRect.left
  if (x + cardW > window.innerWidth - M) {
    x = Math.max(M, anchorRect.right - cardW)
  }
  x = Math.max(M, Math.min(x, window.innerWidth - cardW - M))

  return { top, bottom, left: x, maxCardHeight }
}
