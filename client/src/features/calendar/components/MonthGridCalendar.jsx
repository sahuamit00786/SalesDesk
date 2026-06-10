import { useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { buildMonthGridCells, shiftMonth, WEEKDAY_LABELS_MON } from '@/features/calendar/utils/monthGrid'

/**
 * Month grid matching Calendar & Meetings (MiniMonthPicker / react-big-calendar month styling).
 */
export function MonthGridCalendar({
  year,
  month,
  onMonthChange,
  onDayClick,
  renderDayContent,
  headerExtra,
  weekStartsOn = 1,
  weekDayLabels = WEEKDAY_LABELS_MON,
  minCellHeight = 'min-h-[108px]',
  className,
}) {
  const today = useMemo(() => new Date(), [])
  const cells = useMemo(() => buildMonthGridCells(year, month, weekStartsOn), [year, month, weekStartsOn])

  const monthLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
    [year, month],
  )

  function go(delta) {
    const next = shiftMonth(year, month, delta)
    onMonthChange?.(next.year, next.month)
  }

  function goToday() {
    const now = new Date()
    onMonthChange?.(now.getFullYear(), now.getMonth() + 1)
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => go(-1)}
              className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 sm:text-[0.84375rem] sm:leading-snug">{monthLabel}</h2>
        </div>
        {headerExtra ? <div className="flex flex-wrap items-center gap-2">{headerExtra}</div> : null}
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekDayLabels.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium text-gray-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-white">
        {cells.map((cell) => {
          const isToday = isSameDay(cell.date, today)
          const clickable = Boolean(onDayClick)
          const content = renderDayContent?.(cell)

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!clickable}
              onClick={() => onDayClick?.(cell.key, cell)}
              className={cn(
                'flex w-full flex-col p-2 text-left transition-colors',
                minCellHeight,
                cell.outside && 'bg-gray-50/80',
                !cell.outside && 'bg-white',
                clickable &&
                  'cursor-pointer hover:bg-gray-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/35',
                !clickable && 'cursor-default',
                isToday && 'bg-brand-50/60 ring-1 ring-inset ring-brand-200/80',
              )}
            >
              <div className="mb-1.5 flex justify-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium tabular-nums',
                    isToday && 'bg-[var(--brand-primary)] font-semibold text-white shadow-sm',
                    !isToday && cell.outside && 'text-gray-300',
                    !isToday && !cell.outside && 'text-gray-800',
                  )}
                >
                  {format(cell.date, 'd')}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">{content}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
