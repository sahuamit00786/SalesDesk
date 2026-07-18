import { cn } from '@/utils/cn'

const TONES = {
  neutral: 'border-surface-border bg-white',
  brand: 'border-brand-100 bg-brand-50/50',
  emerald: 'border-emerald-100 bg-emerald-50/50',
  amber: 'border-amber-100 bg-amber-50/50',
  red: 'border-red-100 bg-red-50/50',
  sky: 'border-sky-100 bg-sky-50/50',
}

/**
 * Summary tiles above the quotations/invoices grids.
 * cards: [{ key, label, value, sub, tone }]
 * Sums may mix currencies — callers label values honestly.
 */
export function SalesDocStatCards({ cards }) {
  if (!cards?.length) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className={cn('rounded-2xl border px-3.5 py-3 shadow-sm', TONES[card.tone] || TONES.neutral)}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{card.label}</p>
          <p className="mt-1 truncate text-lg font-semibold tabular-nums text-ink">{card.value}</p>
          {card.sub ? <p className="mt-0.5 truncate text-xs text-ink-muted">{card.sub}</p> : null}
        </div>
      ))}
    </div>
  )
}
