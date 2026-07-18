import { cn } from '@/utils/cn'
import { useDayEventsOverflow } from '@/features/calendar/components/DayEventsOverflowContext'

export function MonthShowMoreButton({ count, slotDate, events }) {
  const openDayEvents = useDayEventsOverflow()
  if (!count) return null

  return (
    <button
      type="button"
      className={cn(
        'rbc-show-more month-show-more-btn',
        'mx-0.5 mt-0.5 flex w-[calc(100%-4px)] items-center justify-center rounded-md',
        'px-2 py-0.5 text-[11px] font-semibold transition-colors',
        'bg-brand-50 text-brand-700 hover:bg-brand-100',
      )}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openDayEvents?.({ date: slotDate, events })
      }}
    >
      +{count}
    </button>
  )
}
