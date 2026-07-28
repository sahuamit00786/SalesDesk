/** Small centered confirmation modal — used instead of the plain browser confirm()
 * so it matches the WhatsApp theme (title + message + Cancel/Confirm). */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {message ? <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{message}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="h-8 rounded-lg border border-surface-border px-3 text-xs font-medium text-ink hover:bg-surface-muted" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`h-8 rounded-lg px-3 text-xs font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : ''}`}
            style={!danger ? { backgroundColor: 'var(--wa-accent, #00a884)' } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
