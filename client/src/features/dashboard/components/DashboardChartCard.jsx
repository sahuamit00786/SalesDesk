import { cn } from '@/utils/cn'

export function DashboardChartCard({ title, subtitle, children, className }) {
  return (
    <section
      className={cn(
        'rounded-xl border border-[#F7F5FB] bg-white p-2.5 shadow-sm sm:p-3',
        className,
      )}
    >
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
      <div className="min-h-[180px] w-full">{children}</div>
    </section>
  )
}

/**
 * KPI tile with optional period comparison line (dummy-friendly).
 */
export function StatDeltaCard({ label, value, hint, delta, deltaPositive = true, compact = false }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-surface-border bg-white shadow-sm',
        compact ? 'p-3.5 sm:p-4' : 'p-5',
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={cn('mt-2 font-semibold tabular-nums text-ink', compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl')}>
        {value}
      </p>
      <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1', compact ? 'mt-1.5' : 'mt-2')}>
        {hint ? <p className={cn(compact ? 'text-xs text-ink-muted' : 'text-sm text-ink-muted')}>{hint}</p> : null}
        {delta ? (
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              deltaPositive ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  )
}
