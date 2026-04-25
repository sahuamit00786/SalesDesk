import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Right-side panel (~40vw) with backdrop. Prefer this over centered modals for create/edit flows.
 */
export function RightDrawer({ open, onClose, title, description, children, footer, className }) {
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
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="right-drawer-title">
      <button
        type="button"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside
        className={cn(
          'relative flex h-full max-h-dvh w-full max-w-full flex-col bg-surface shadow-2xl animate-in slide-in-from-right duration-200 ease-out sm:max-w-[min(560px,40vw)] sm:min-w-[320px]',
          'border-l border-surface-border sm:rounded-l-2xl',
          className,
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-border px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 pr-2">
            <h2 id="right-drawer-title" className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm leading-relaxed text-ink-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? <footer className="shrink-0 border-t border-surface-border px-5 py-3 sm:px-6 sm:py-4">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  )
}
