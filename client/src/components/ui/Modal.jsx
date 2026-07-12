import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClassName = 'max-w-md',
  maxHeightClassName = 'max-h-[min(90vh,calc(100dvh-2rem))]',
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          'relative z-[101] flex w-full flex-col rounded-2xl bg-white p-6 shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          maxHeightClassName,
          maxWidthClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pr-2">
            <h2 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <div id="modal-description" className="mt-1 text-sm text-gray-500">
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-subtle"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scrollbar-subtle mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-4">{children}</div>
        </div>
        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-surface-border pt-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

Modal.Footer = function ModalFooter({ onCancel, onConfirm, confirmLabel = 'Save', cancelLabel = 'Cancel', loading }) {
  return (
    <>
      <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button variant="primary" type="button" onClick={onConfirm} disabled={loading}>
        {confirmLabel}
      </Button>
    </>
  )
}
