import { cn } from '@/utils/cn'

/**
 * Single filter/toolbar card below the Topbar.
 * Place search, tabs, selects, and actions in one aligned row.
 */
export function PageFilterBar({ children, className, chips }) {
  return (
    <div
      className={cn(
        'flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-white px-3 py-2.5 shadow-sm',
        '[&_input]:border-surface-field [&_select]:border-surface-field [&_textarea]:border-surface-field',
        className,
      )}
    >
      {children}
      {chips ? <div className="flex flex-wrap items-center gap-1.5">{chips}</div> : null}
    </div>
  )
}
