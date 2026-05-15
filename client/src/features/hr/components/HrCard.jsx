import { cn } from '@/utils/cn'

export function HrCard({ title, description, icon: Icon, action, children, className, bodyClassName, flush }) {
  const hasHeader = Boolean(title || description || action || Icon)

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm ring-1 ring-black/[0.04]',
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-border/70 bg-gradient-to-r from-[#534AB7]/[0.06] via-brand-50/40 to-white px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200/60 bg-brand-50 text-brand-700 shadow-sm">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2> : null}
              {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn(!flush && 'p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
