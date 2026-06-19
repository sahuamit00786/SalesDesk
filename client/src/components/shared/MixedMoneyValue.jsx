import { useMemo } from 'react'
import {
  aggregateMoneyByCurrency,
  formatMoneyAggregate,
  moneyAggregateTooltip,
} from '@/utils/money'
import { cn } from '@/utils/cn'

/**
 * Renders a monetary aggregate; shows "mixed" with hover/title breakdown when multiple currencies.
 */
export function MixedMoneyValue({
  rows,
  getAmount = (r) => r.dealValue ?? r.value ?? 0,
  getCurrency = (r) => r.dealCurrency ?? r.valueCurrency ?? r.currency ?? 'USD',
  mode = 'sum',
  className,
}) {
  const aggregate = useMemo(
    () => aggregateMoneyByCurrency(rows, getAmount, getCurrency, mode),
    [rows, getAmount, getCurrency, mode],
  )
  const label = formatMoneyAggregate(aggregate)
  const tooltip = moneyAggregateTooltip(aggregate)

  if (label === 'mixed') {
    return (
      <span
        className={cn('cursor-help border-b border-dotted border-ink-muted', className)}
        title={tooltip}
        aria-label={tooltip.replace(/\n/g, ', ')}
      >
        mixed
      </span>
    )
  }

  return <span className={className}>{label}</span>
}
