import { cn } from '@/utils/cn'

export function HrStatCard({ label, value, subtext, icon: Icon, tone = 'neutral', className }) {
  const tones = {
    present: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white',
    absent: 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-white',
    late: 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white',
    half_day: 'border-sky-200/80 bg-gradient-to-br from-sky-50 to-white',
    brand: 'border-brand-200/80 bg-gradient-to-br from-brand-50 to-white',
    neutral: 'border-surface-border bg-white',
  }
  const labelTones = {
    present: 'text-emerald-700/90',
    absent: 'text-rose-700/90',
    late: 'text-amber-700/90',
    half_day: 'text-sky-700/90',
    brand: 'text-brand-700/90',
    neutral: 'text-ink-muted',
  }
  const valueTones = {
    present: 'text-emerald-900',
    absent: 'text-rose-900',
    late: 'text-amber-900',
    half_day: 'text-sky-900',
    brand: 'text-brand-900',
    neutral: 'text-ink',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 shadow-sm ring-1 ring-black/[0.03]',
        tones[tone] || tones.neutral,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-[11px] font-semibold uppercase tracking-wider', labelTones[tone] || labelTones.neutral)}>
          {label}
        </p>
        {Icon ? <Icon className={cn('h-4 w-4 shrink-0 opacity-70', labelTones[tone])} aria-hidden /> : null}
      </div>
      <p className={cn('mt-2 text-2xl font-bold tabular-nums tracking-tight', valueTones[tone] || valueTones.neutral)}>
        {value}
      </p>
      {subtext ? <p className="mt-1 text-xs text-ink-muted">{subtext}</p> : null}
    </div>
  )
}
