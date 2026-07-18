import { cn } from '@/utils/cn'

/** Main content area: rounded border, white background, minimal padding */
export function PageContentPanel({ children, className, flush = false }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-surface-border bg-white shadow-sm',
        flush ? 'p-0' : 'p-3 sm:p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
