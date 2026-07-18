import { format, isPast, isSameDay } from 'date-fns'
import { Video, CheckSquare, Phone, TrendingUp, Bell, User, BadgeCheck, CalendarDays } from '@/components/ui/icons'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import { CALENDAR_FILTERS, getEventColor, getKindBgClass } from '@/features/calendar/eventColors'

const iconMap = {
  meeting: Video,
  task: CheckSquare,
  followup: Phone,
  opportunity: TrendingUp,
  reminder: Bell,
}

const statusLabels = {
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  missed: 'Missed',
  open: 'Open',
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  dismissed: 'Dismissed',
}

function getKindLabel(kind) {
  return CALENDAR_FILTERS.find((f) => f.id === kind)?.label || kind || 'Event'
}

export function DayEventsModal({ open, date, events = [], onClose, onEventClick }) {
  const now = new Date()
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={date ? format(date, 'EEEE, d MMMM yyyy') : 'Events'}
      description={
        sorted.length
          ? `${sorted.length} event${sorted.length === 1 ? '' : 's'} on this day`
          : 'No events on this day'
      }
      maxWidthClassName="max-w-lg"
    >
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center">
          <CalendarDays className="h-8 w-8 text-gray-300" aria-hidden />
          <p className="text-sm text-gray-500">Nothing scheduled for this day.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((event) => {
            const EventIcon = iconMap[event.kind] || Bell
            const eventStart = new Date(event.start)
            const eventEnd = event.end ? new Date(event.end) : null
            const color = event.color || getEventColor(event.kind, event.status, event.meta)
            const isNow =
              event.kind === 'meeting' && eventEnd && now >= eventStart && now <= eventEnd
            const isPastEvent = isPast(eventStart) && !isSameDay(eventStart, now)
            const isDone = event.status === 'completed' || event.status === 'done'

            return (
              <li key={event.id || `${event.title}-${event.start}`}>
                <button
                  type="button"
                  onClick={() => {
                    onEventClick?.(event)
                    onClose?.()
                  }}
                  className={cn(
                    'group w-full rounded-xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition-all',
                    'hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-md',
                    isPastEvent && 'opacity-70',
                  )}
                  style={{ borderLeftWidth: 4, borderLeftColor: color }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn('mt-0.5 shrink-0 rounded-lg p-2', getKindBgClass(event.kind))}
                    >
                      <EventIcon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: `${color}18`, color }}
                        >
                          {getKindLabel(event.kind)}
                        </span>
                        {event.status ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              isDone
                                ? 'bg-green-100 text-green-700'
                                : event.status === 'live'
                                  ? 'bg-rose-100 text-rose-700'
                                  : event.status === 'in_progress'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-600',
                            )}
                          >
                            <BadgeCheck className="h-3 w-3" />
                            {statusLabels[event.status] || event.status}
                          </span>
                        ) : null}
                      </div>

                      <p
                        className={cn(
                          'text-sm font-semibold leading-snug text-gray-900',
                          isDone && 'text-gray-400 line-through',
                        )}
                      >
                        {event.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">
                          {format(eventStart, 'h:mm a')}
                          {eventEnd && !event.allDay
                            ? ` – ${format(eventEnd, 'h:mm a')}`
                            : null}
                          {isNow ? (
                            <span className="ml-2 text-[10px] font-bold uppercase text-rose-500">
                              Now
                            </span>
                          ) : null}
                        </span>
                        {event.leadName ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.leadName}</span>
                          </span>
                        ) : null}
                        {event.ownerName ? (
                          <span className="truncate text-gray-400">{event.ownerName}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
