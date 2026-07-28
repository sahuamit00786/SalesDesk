/** Material/WhatsApp-style click ripple. Spread `onMouseDown={createRipple}` on a
 * `relative overflow-hidden` button — no state, just a transient DOM node. */
export function createRipple(event) {
  const button = event.currentTarget
  if (!button) return
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const span = document.createElement('span')
  span.className = 'lf-wa-ripple-span'
  span.style.width = `${size}px`
  span.style.height = `${size}px`
  span.style.left = `${event.clientX - rect.left - size / 2}px`
  span.style.top = `${event.clientY - rect.top - size / 2}px`
  button.appendChild(span)
  window.setTimeout(() => span.remove(), 500)
}
