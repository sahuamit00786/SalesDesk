import { cn } from '@/utils/cn'

export function ReportKpiCard({
  label, value, hint, delta, deltaPositive = true,
  icon: Icon, iconBg = 'bg-brand-50', iconColor = 'text-brand-600',
  accentColor, onClick, className,
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border border-surface-border bg-white px-3 py-2.5 text-left shadow-sm',
        onClick && 'transition-colors hover:border-brand-300 hover:bg-brand-50/30',
        className,
      )}
    >
      {/* Left accent bar */}
      {accentColor && (
        <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accentColor}`} />
      )}

      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">{label}</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-ink sm:text-xl">{value ?? '—'}</p>
          {(hint || delta) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        )}
      </div>
    </Tag>
  )
}
