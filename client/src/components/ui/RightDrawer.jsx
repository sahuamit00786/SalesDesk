import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Right-side panel (~40vw) with backdrop. Prefer this over centered modals for create/edit flows.
 */
export function RightDrawer({ open, onClose, title, description, children, footer, className, leftPanel, containerClassName }) {
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
      <div
        className={cn(
          'relative flex h-full max-h-dvh w-full max-w-full bg-white shadow-2xl animate-in slide-in-from-right duration-200 ease-out',
          'border-l border-brand-200/60 sm:rounded-l-2xl overflow-hidden',
          !containerClassName && (leftPanel
            ? 'sm:max-w-[min(560px,40vw)] sm:min-w-[320px] lg:max-w-[min(1240px,84vw)]'
            : 'sm:max-w-[min(560px,40vw)] sm:min-w-[320px]'),
          containerClassName,
        )}
      >
        {leftPanel ? (
          <section className="hidden h-full w-[min(680px,44vw)] shrink-0 flex-col overflow-hidden border-r border-surface-border bg-white lg:flex">
            {leftPanel}
          </section>
        ) : null}
        <aside
          className={cn(
            'relative flex h-full min-w-0 flex-1 flex-col bg-white',
            className,
          )}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-brand-600/35 px-4 py-3">
            <div className="min-w-0 pr-2">
              <h2 id="right-drawer-title" className="text-base font-semibold tracking-tight text-ink">
                {title}
              </h2>
              {description ? <p className="mt-0.5 text-xs leading-snug text-ink-muted">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-black/[0.06] hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>
          <div className="drawer-form scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
            {children}
          </div>
          {footer ? <footer className="drawer-footer shrink-0 border-t-2 border-brand-600/35 bg-white px-4 py-2">{footer}</footer> : null}
        </aside>
      </div>
    </div>,
    document.body,
  )
}
