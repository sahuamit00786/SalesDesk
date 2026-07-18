import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

/** Build month grid cells (includes leading/trailing outside-month days). */
export function buildMonthGridCells(year, month, weekStartsOn = 1) {
  const current = new Date(year, month - 1, 1)
  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return days.map((date) => ({
    date,
    key: format(date, 'yyyy-MM-dd'),
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    outside: !isSameMonth(date, current),
  }))
}

export function shiftMonth(year, month, delta) {
  const next = addMonths(new Date(year, month - 1, 1), delta)
  return { year: next.getFullYear(), month: next.getMonth() + 1 }
}

export const WEEKDAY_LABELS_MON = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
export const WEEKDAY_LABELS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
