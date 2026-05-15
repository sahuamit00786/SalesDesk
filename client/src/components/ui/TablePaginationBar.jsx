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

const pageNumBtn = 'min-w-[2.25rem] tabular-nums'

/**
 * @param {{
 *   page: number
 *   totalPages: number
 *   onPageChange: (page: number) => void
 *   subLabel?: import('react').ReactNode
 *   beforeNav?: import('react').ReactNode
 *   className?: string
 *   variant?: 'surface' | 'neutral'
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
}) {
  const safeTotal = Math.max(1, totalPages)
  const safePage = Math.min(Math.max(1, page), safeTotal)
  const items = buildPaginationItems(safePage, safeTotal)

  const shell =
    variant === 'neutral'
      ? 'divide-neutral-200 border-neutral-200 bg-white text-neutral-700'
      : 'divide-slate-200 border-slate-200 bg-white text-ink'

  const activeBg = variant === 'neutral' ? 'bg-neutral-100' : 'bg-slate-100'
  const labelMuted = variant === 'neutral' ? 'text-neutral-500' : 'text-ink-muted'
  const hoverCell = variant === 'neutral' ? 'hover:bg-neutral-50/90' : 'hover:bg-slate-50/90'

  const segBtn = cn(
    'inline-flex min-h-[2.25rem] shrink-0 items-center justify-center px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
    variant === 'neutral' ? 'text-neutral-700' : 'text-ink',
  )

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm tabular-nums', labelMuted)}>
          Page {safePage} of {safeTotal}
        </p>
        {subLabel ? <div className={cn('mt-0.5 text-xs tabular-nums', labelMuted)}>{subLabel}</div> : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
        {beforeNav}
        <nav
          className={cn('inline-flex divide-x overflow-hidden rounded-xl border shadow-sm', shell)}
          aria-label="Pagination"
        >
          <button
            type="button"
            className={cn(segBtn, hoverCell, 'gap-1.5 pr-3.5 pl-3')}
            disabled={safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            Previous
          </button>
          {items.map((item) =>
            item.type === 'ellipsis' ? (
              <span
                key={item.key}
                className={cn(
                  'inline-flex min-h-[2.25rem] items-center px-2.5 py-2 text-sm',
                  variant === 'neutral' ? 'text-neutral-400' : 'text-slate-400',
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
            className={cn(segBtn, hoverCell, 'gap-1.5 pl-3.5 pr-3')}
            disabled={safePage >= safeTotal}
            onClick={() => onPageChange(Math.min(safeTotal, safePage + 1))}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </button>
        </nav>
      </div>
    </div>
  )
}
