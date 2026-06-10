import { cn } from '@/utils/cn'
import { PageFilterBar } from '@/components/layout/PageFilterBar'

export function HrToolbar({ children, className }) {
  return (
    <PageFilterBar className={cn('min-h-0', className)}>{children}</PageFilterBar>
  )
}

export function HrToolbarGroup({ label, children, className, inline = false }) {
  if (inline) {
    return (
      <div className={cn('flex min-w-0 items-center gap-2', className)}>
        {label ? (
          <span className="shrink-0 text-xs font-medium text-ink-muted">{label}</span>
        ) : null}
        {children}
      </div>
    )
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</span>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}
