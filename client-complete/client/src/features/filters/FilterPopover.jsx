import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

/**
 * Floating panel anchored below a trigger (e.g. Filters button).
 */
export function FilterPopover({ open, onClose, anchorRef, children, className, panelWidth = 608 }) {
  const panelRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: panelWidth })

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return

    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      const maxW = Math.min(panelWidth, window.innerWidth - 24)
      let left = rect.left
      if (left + maxW > window.innerWidth - 12) {
        left = window.innerWidth - maxW - 12
      }
      left = Math.max(12, left)
      const top = rect.bottom + 6
      setPos({ top, left, width: maxW })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef, panelWidth])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointer = (e) => {
      const t = e.target
      if (panelRef.current?.contains(t)) return
      if (anchorRef?.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 60 }}
      className={cn('qf-popover', className)}
    >
      {children}
    </div>,
    document.body,
  )
}
