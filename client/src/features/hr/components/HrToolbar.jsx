import { cn } from '@/utils/cn'

export function HrToolbar({ children, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-surface-border bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/[0.04] sm:px-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function HrToolbarGroup({ label, children, className }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
