import { cn } from '@/utils/cn'

export function ReportKpiCard({
  label, value, hint, delta, deltaPositive = true,
  icon: Icon, iconBg = 'bg-brand-50', iconColor = 'text-brand-600',
  accentColor,
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-white px-5 py-4 shadow-sm">
      {/* Left accent bar */}
      {accentColor && (
        <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${accentColor}`} />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">{value ?? '—'}</p>
          {(hint || delta) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              {hint && <p className="text-xs text-ink-muted">{hint}</p>}
              {delta && (
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                  deltaPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                )}>
                  {deltaPositive ? '↑' : '↓'} {delta}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  )
}
