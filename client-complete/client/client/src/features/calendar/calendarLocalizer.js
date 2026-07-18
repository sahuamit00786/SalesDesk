import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { dateFnsLocalizer, Views } from 'react-big-calendar'

const locales = { 'en-US': enUS }

export const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export const CALENDAR_VIEW_OPTIONS = [
  { id: Views.DAY, label: 'Day' },
  { id: Views.WEEK, label: 'Full Week' },
  { id: Views.MONTH, label: 'Month' },
]

export { Views }
