import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const POPOVER_WIDTH = 240

/**
 * Floating popover that lists merge-tag fields. Positioned at viewport
 * coordinates supplied by the parent (`anchor.top`, `anchor.left`) so it sits
 * directly below wherever the `@` was typed.
 */
export function MentionPopover({ open, anchor, options, onPick, onClose, query = '' }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="listbox"
      className="fixed z-[160] w-60 overflow-hidden rounded-xl border border-orange-200 bg-white shadow-xl ring-1 ring-orange-50 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: anchor?.top ?? 0, left: anchor?.left ?? 0 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between border-b border-surface-border bg-orange-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
        <span>Lead variables</span>
        <span className="text-orange-500">@{query}</span>
      </div>
      <div className="scrollbar-subtle max-h-56 overflow-y-auto py-1">
        {options?.length ? (
          options.map((field) => (
            <button
              key={field}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick?.(field)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-ink hover:bg-orange-50"
            >
              <span className="font-medium">@{field}</span>
              <span className="text-[10px] text-ink-muted">{`{{${field}}}`}</span>
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-[11px] text-ink-muted">No matching variables</p>
        )}
      </div>
    </div>,
    document.body,
  )
}

let _measureCanvas = null
function measureTextWidth(font, text) {
  if (typeof document === 'undefined') return 0
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas')
  const ctx = _measureCanvas.getContext('2d')
  if (!ctx) return 0
  ctx.font = font
  return ctx.measureText(text || '').width
}

function fontStringFromComputedStyle(cs) {
  const fontStyle = cs.fontStyle || 'normal'
  const fontWeight = cs.fontWeight || '400'
  const fontSize = cs.fontSize || '14px'
  const fontFamily = cs.fontFamily || 'sans-serif'
  return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`.trim()
}

function clampToViewport(top, left) {
  const safeTop = Math.max(8, Math.min(top, window.innerHeight - 80))
  const safeLeft = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8))
  return { top: safeTop, left: safeLeft }
}

/**
 * Position the popover directly under the `@` symbol of an `<input>` /
 * `<textarea>`. Uses a canvas to measure the exact width of the text preceding
 * `@`, then offsets from the field's bottom edge. Returns `{ top, left }` in
 * viewport coordinates (since the popover uses `position: fixed`).
 */
export function popoverCoordsForTextField(el, atIndex) {
  if (!el) return { top: 0, left: 0 }
  const rect = el.getBoundingClientRect()
  const cs = window.getComputedStyle(el)
  const font = fontStringFromComputedStyle(cs)
  const beforeAt = String(el.value || '').slice(0, Math.max(0, atIndex))
  const xOffset = measureTextWidth(font, beforeAt)
  const paddingLeft = parseFloat(cs.paddingLeft) || 0
  const borderLeft = parseFloat(cs.borderLeftWidth) || 0
  const scrollLeft = el.scrollLeft || 0
  const top = rect.bottom + 6
  const left = rect.left + borderLeft + paddingLeft + xOffset - scrollLeft
  return clampToViewport(top, left)
}

/**
 * Position the popover under the caret of the current Selection (intended for
 * a contentEditable). Uses native rect math so it handles wrapping correctly.
 */
export function popoverCoordsForSelection() {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null
  if (!sel || sel.rangeCount === 0) return { top: 0, left: 0 }
  const range = sel.getRangeAt(0).cloneRange()
  range.collapse(true)
  let r = range.getClientRects()[0]
  if (!r) {
    const span = document.createElement('span')
    span.appendChild(document.createTextNode('\u200b'))
    range.insertNode(span)
    r = span.getBoundingClientRect()
    span.parentNode?.removeChild(span)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  if (!r) return { top: 0, left: 0 }
  return clampToViewport(r.bottom + 6, r.left)
}

/**
 * Replace the `@query` token immediately preceding the caret in a text field
 * with `{{field}}` and restore the caret after the inserted token.
 */
export function insertMergeTagInTextField(el, mentionStart, field) {
  if (!el || mentionStart == null) return el?.value || ''
  const value = el.value || ''
  const cursor = el.selectionStart ?? value.length
  const before = value.slice(0, mentionStart)
  const after = value.slice(cursor)
  const token = `{{${field}}}`
  const next = `${before}${token}${after}`
  requestAnimationFrame(() => {
    el.focus()
    const pos = before.length + token.length
    el.setSelectionRange(pos, pos)
  })
  return next
}
