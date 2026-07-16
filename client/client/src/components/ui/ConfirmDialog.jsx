import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

/**
 * Centered confirmation dialog for destructive or important actions.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidthClassName="max-w-md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </>
      }
    >
      {children ? <div className="text-sm text-ink-muted">{children}</div> : null}
    </Modal>
  )
}
