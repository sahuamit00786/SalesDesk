import { cn } from '@/utils/cn'

export function HrCalendarLegend({ items, className }) {
  if (!items?.length) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <span className={cn('h-2.5 w-2.5 rounded-full border', item.dotClassName)} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  )
}
