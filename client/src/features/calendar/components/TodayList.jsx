import { format, isSameDay, isPast } from 'date-fns'
import { Video, CheckSquare, Phone, TrendingUp, Bell, Clock, User, CalendarClock } from '@/components/ui/icons'
import { cn } from '@/utils/cn'
import { getKindBgClass } from '../eventColors'

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

export function statusPillClass(status) {
  if (status === 'completed' || status === 'done') return 'bg-emerald-100 text-emerald-700'
  if (status === 'live') return 'bg-rose-100 text-rose-700'
  if (status === 'in_progress') return 'bg-amber-100 text-amber-800'
  if (['scheduled', 'pending', 'open'].includes(status)) return 'bg-brand-100 text-brand-700'
  return 'bg-gray-100 text-gray-600'
}

export function TodayList({ events, title = 'Today', selectedDate, onEventClick }) {
  // Filter events for the selected date
  const dayEvents = events.filter((e) => isSameDay(new Date(e.start), selectedDate))
  const now = new Date()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {title === 'Today' && <Clock className="h-3.5 w-3.5 text-brand-500" />}
          {title}
        </h4>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-6 text-center">
          <CalendarClock className="h-6 w-6 text-gray-300" />
          <p className="text-xs font-medium text-gray-400">No events scheduled</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((event) => {
            const EventIcon = iconMap[event.kind] || Bell
            const eventStart = new Date(event.start)
            const isNow = event.kind === 'meeting' && now >= eventStart && now <= new Date(event.end)
            const isPastEvent = isPast(eventStart) && !isSameDay(eventStart, now)
            const isDone = event.status === 'completed' || event.status === 'done'

            return (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  'group relative w-full overflow-hidden rounded-xl border border-gray-100 bg-white py-2.5 pl-4 pr-3 text-left shadow-sm transition-all',
                  'hover:-translate-y-px hover:border-brand-200 hover:shadow-md',
                  isPastEvent && !isNow && 'opacity-60 hover:opacity-100',
                )}
              >
                {/* Kind accent bar */}
                <span
                  className="absolute inset-y-0 left-0 w-1.5 rounded-r"
                  style={{ backgroundColor: event.color || '#94a3b8' }}
                />

                <div className="flex items-start gap-2.5">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', getKindBgClass(event.kind))}>
                    <EventIcon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold tabular-nums text-gray-500">
                        {format(eventStart, 'h:mm a')}
                      </span>
                      {isNow ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-600">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                          </span>
                          Now
                        </span>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase', statusPillClass(event.status))}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                          {statusLabels[event.status] || event.status}
                        </span>
                      )}
                    </div>

                    <p className={cn('mt-0.5 truncate text-[13px] font-semibold leading-snug text-gray-900', isDone && 'text-gray-400 line-through')} title={event.title}>
                      {event.title}
                    </p>

                    {event.leadName && (
                      <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-gray-500">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{event.leadName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
