/**
 * Position fixed calendar event popovers so they stay fully in the viewport.
 * @param {DOMRect | { top: number, left: number, right: number, bottom: number, width: number, height: number }} anchorRect
 */
export function computeCalendarPopoverPosition(anchorRect) {
  const M = 12
  if (!anchorRect) return { top: 0, left: 0, maxCardHeight: 640 }
  const cardW = Math.min(420, window.innerWidth - 2 * M)
  const maxH = Math.min(640, window.innerHeight * 0.82, window.innerHeight - 2 * M)

  const spaceBelow = window.innerHeight - anchorRect.bottom - M
  const spaceAbove = anchorRect.top - M

  let y = anchorRect.bottom + M
  if (spaceBelow >= maxH) {
    y = anchorRect.bottom + M
  } else if (spaceAbove >= maxH) {
    y = anchorRect.top - maxH - M
  } else {
    y = Math.max(M, window.innerHeight - maxH - M)
  }
  y = Math.max(M, Math.min(y, window.innerHeight - maxH - M))

  let x = anchorRect.left
  if (x + cardW > window.innerWidth - M) {
    x = Math.max(M, anchorRect.right - cardW)
  }
  x = Math.max(M, Math.min(x, window.innerWidth - cardW - M))

  return { top: y, left: x, maxCardHeight: maxH }
}
