import { useMemo, useState } from 'react'
import {
  aggregateMoneyByCurrency,
  formatMoneyAggregate,
  moneyAggregateTooltip,
} from '@/utils/money'
import { cn } from '@/utils/cn'

/**
 * Renders a monetary aggregate; shows "mixed" with a hover/focus breakdown popover when multiple currencies.
 */
export function MixedMoneyValue({
  rows,
  getAmount = (r) => r.dealValue ?? r.value ?? 0,
  getCurrency = (r) => r.dealCurrency ?? r.valueCurrency ?? r.currency ?? 'USD',
  mode = 'sum',
  className,
}) {
  const [open, setOpen] = useState(false)
  const aggregate = useMemo(
    () => aggregateMoneyByCurrency(rows, getAmount, getCurrency, mode),
    [rows, getAmount, getCurrency, mode],
  )
  const label = formatMoneyAggregate(aggregate)

  if (label === 'mixed') {
    const breakdown = moneyAggregateTooltip(aggregate).split('\n').filter(Boolean)
    return (
      <span
        className="relative inline-block"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <span
          tabIndex={0}
          className={cn('cursor-help border-b border-dotted border-ink-muted outline-none', className)}
          aria-label={breakdown.join(', ')}
        >
          mixed
        </span>
        {open ? (
          <span
            role="tooltip"
            className="absolute left-1/2 top-full z-50 mt-2 w-max min-w-[7rem] -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-left text-xs font-medium normal-case text-white shadow-lg"
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-slate-700 bg-slate-900" />
            {breakdown.map((line) => (
              <span key={line} className="block whitespace-nowrap leading-relaxed">
                {line}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    )
  }

  return <span className={className}>{label}</span>
}
