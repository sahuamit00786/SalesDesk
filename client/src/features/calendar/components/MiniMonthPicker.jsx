import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export function MiniMonthPicker({
  currentDate,
  onChange,
  selectedDate,
  rangeStart,
  rangeEnd,
  onRangePick,
  events = [],
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  const getDayEvents = (day) => {
    return events.filter(e => {
      const eventDate = new Date(e.start)
      return isSameDay(eventDate, day)
    })
  }

  const handlePrevMonth = () => onChange(subMonths(currentDate, 1))
  const handleNextMonth = () => onChange(addMonths(currentDate, 1))
  const handleDayClick = (day) => {
    onChange(day)
    onRangePick?.(day)
  }

  const isInRange = (day) => {
    if (!rangeStart || !rangeEnd) return false
    return (
      isSameDay(day, rangeStart) ||
      isSameDay(day, rangeEnd) ||
      (isAfter(day, rangeStart) && isBefore(day, rangeEnd))
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </span>
        <div className="flex gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isSelected = isSameDay(day, selectedDate)
          const isRangeStart = rangeStart ? isSameDay(day, rangeStart) : false
          const isRangeEnd = rangeEnd ? isSameDay(day, rangeEnd) : false
          const inRange = isInRange(day)
          const isToday = isSameDay(day, new Date())
          const dayEvents = getDayEvents(day)
          const hasEvents = dayEvents.length > 0

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                'relative h-8 w-8 flex items-center justify-center text-sm rounded-lg transition-all',
                !isCurrentMonth && 'text-gray-300',
                isCurrentMonth && !isSelected && 'text-gray-700 hover:bg-gray-100',
                inRange && !isRangeStart && !isRangeEnd && 'bg-indigo-100 text-indigo-700 rounded-md',
                (isRangeStart || isRangeEnd) && 'bg-indigo-600 text-white font-medium shadow-sm',
                isToday && !isSelected && 'text-indigo-600 font-semibold bg-indigo-50',
              )}
            >
              {format(day, 'd')}
              {hasEvents && !isSelected && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: e.color || '#6366f1' }}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
