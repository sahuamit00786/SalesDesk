import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidthClassName = 'max-w-md',
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
        role="presentation"
      />

      <div
        className={cn(
          'relative w-full bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-5',
          'animate-in fade-in zoom-in-95 duration-200',
          maxWidthClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-subtle text-ink-muted transition-colors duration-150"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
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
