import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * @param {number} current 1-based
 * @param {number} total
 * @returns {Array<{ type: 'page', value: number } | { type: 'ellipsis', key: string }>}
 */
export function buildPaginationItems(current, total) {
  if (total <= 1) return [{ type: 'page', value: 1 }]
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({ type: 'page', value: i + 1 }))
  }
  const delta = 1
  const set = new Set([1, total])
  for (let i = current - delta; i <= current + delta; i += 1) {
    if (i >= 1 && i <= total) set.add(i)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < sorted.length; i += 1) {
    const p = sorted[i]
    const prev = sorted[i - 1]
    if (i > 0) {
      const gap = p - prev
      if (gap === 2) out.push({ type: 'page', value: prev + 1 })
      else if (gap > 2) out.push({ type: 'ellipsis', key: `${prev}-${p}` })
    }
    out.push({ type: 'page', value: p })
  }
  return out
}

const pageNumBtn = 'tabular-nums'

/**
 * @param {{
 *   page: number
 *   totalPages: number
 *   onPageChange: (page: number) => void
 *   subLabel?: import('react').ReactNode
 *   beforeNav?: import('react').ReactNode
 *   className?: string
 *   variant?: 'surface' | 'neutral' | 'brand'
 *   compact?: boolean
 * }} props
 */
export function TablePaginationBar({
  page,
  totalPages,
  onPageChange,
  subLabel,
  beforeNav,
  className,
  variant = 'surface',
  compact = false,
}) {
  const safeTotal = Math.max(1, totalPages)
  const safePage = Math.min(Math.max(1, page), safeTotal)
  const items = buildPaginationItems(safePage, safeTotal)

  const shell =
    variant === 'neutral'
      ? 'divide-neutral-200 border-neutral-200 bg-white text-neutral-700'
      : variant === 'brand'
        ? 'divide-brand-300 border-brand-400 bg-white text-ink shadow-sm'
        : 'divide-slate-200 border-slate-200 bg-white text-ink'

  const activeBg =
    variant === 'neutral'
      ? 'bg-neutral-100'
      : variant === 'brand'
        ? 'bg-[var(--brand-primary)] text-white'
        : 'bg-slate-100'
  const labelMuted =
    variant === 'neutral'
      ? 'text-neutral-500'
      : variant === 'brand'
        ? 'text-brand-900'
        : 'text-ink-muted'
  const hoverCell =
    variant === 'neutral'
      ? 'hover:bg-neutral-50/90'
      : variant === 'brand'
        ? 'hover:bg-brand-50'
        : 'hover:bg-slate-50/90'

  const segBtn = cn(
    'inline-flex shrink-0 items-center justify-center font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
    compact
      ? 'min-h-[1.6875rem] px-2 py-0.5 text-xs'
      : 'min-h-[2.25rem] px-3 py-2 text-sm',
    variant === 'neutral' ? 'text-neutral-700' : variant === 'brand' ? 'text-brand-900' : 'text-ink',
  )

  const pageNumMin = compact ? 'min-w-[1.75rem]' : 'min-w-[2.25rem]'
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  const hasLeft = beforeNav || subLabel

  return (
    <div className={cn('flex flex-wrap items-center justify-between', compact ? 'gap-2' : 'gap-3', className)}>
      {/* Left: rows-per-page selector + showing info */}
      {hasLeft ? (
        <div className={cn('flex shrink-0 flex-wrap items-center', compact ? 'gap-2' : 'gap-3')}>
          {beforeNav}
          {subLabel ? (
            <span className={cn('tabular-nums', compact ? 'text-[11px]' : 'text-xs', labelMuted)}>{subLabel}</span>
          ) : null}
        </div>
      ) : null}

      {/* Right: pagination nav */}
      <nav
        className={cn(
          'ml-auto inline-flex divide-x overflow-hidden border shadow-sm',
          compact ? 'rounded-lg' : 'rounded-xl',
          shell,
        )}
        aria-label="Pagination"
      >
        <button
          type="button"
          className={cn(segBtn, hoverCell, compact ? 'gap-1 pl-2 pr-2.5' : 'gap-1.5 pl-3 pr-3.5')}
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          aria-label="Previous page"
        >
          <ChevronLeft className={cn(iconSize, 'shrink-0 opacity-70')} aria-hidden />
          Previous
        </button>
        {items.map((item) =>
          item.type === 'ellipsis' ? (
            <span
              key={item.key}
              className={cn(
                'inline-flex items-center',
                compact ? 'min-h-[1.6875rem] px-1.5 py-0.5 text-xs' : 'min-h-[2.25rem] px-2.5 py-2 text-sm',
                variant === 'neutral'
                  ? 'text-neutral-400'
                  : variant === 'brand'
                    ? 'text-brand-400'
                    : 'text-slate-400',
              )}
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item.value}
              type="button"
              className={cn(
                segBtn,
                pageNumBtn,
                pageNumMin,
                item.value === safePage ? activeBg : hoverCell,
              )}
              onClick={() => onPageChange(item.value)}
              aria-label={`Page ${item.value}`}
              aria-current={item.value === safePage ? 'page' : undefined}
            >
              {item.value}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(segBtn, hoverCell, compact ? 'gap-1 pl-2.5 pr-2' : 'gap-1.5 pl-3.5 pr-3')}
          disabled={safePage >= safeTotal}
          onClick={() => onPageChange(Math.min(safeTotal, safePage + 1))}
          aria-label="Next page"
        >
          Next
          <ChevronRight className={cn(iconSize, 'shrink-0 opacity-70')} aria-hidden />
        </button>
      </nav>
    </div>
  )
}
