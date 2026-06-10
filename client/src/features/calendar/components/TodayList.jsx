import { format, isSameDay, isPast } from 'date-fns'
import { Video, CheckSquare, Phone, TrendingUp, Bell, Clock, User, BadgeCheck } from 'lucide-react'
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

export function TodayList({ events, title = 'Today', selectedDate, onEventClick }) {
  const Icon = title === 'Today' ? Clock : null

  // Filter events for the selected date
  const dayEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return isSameDay(eventDate, selectedDate)
  })

  const now = new Date()

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {title}
        </h4>
        <span className="text-[11px] text-gray-500 font-medium">
          {dayEvents.length} events
        </span>
      </div>

      {dayEvents.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No events scheduled</p>
      ) : (
        <div className="space-y-2.5">
          {dayEvents.map(event => {
            const EventIcon = iconMap[event.kind] || Bell
            const eventStart = new Date(event.start)
            const isNow = event.kind === 'meeting' &&
              now >= eventStart &&
              now <= new Date(event.end)
            const isPastEvent = isPast(eventStart) && !isSameDay(eventStart, now)

            return (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  'w-full rounded-xl border border-gray-100 bg-white p-3 transition-all text-left shadow-sm',
                  'hover:border-brand-200 hover:bg-brand-50/30',
                  isPastEvent && 'opacity-60'
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] font-semibold text-gray-600 leading-tight">
                    {format(eventStart, 'h:mm a')}
                    {isNow && (
                        <span className="ml-2 inline-flex text-[9px] font-bold uppercase text-rose-500">Now</span>
                    )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 min-w-0">
                    <div className={cn('p-1.5 rounded-md mt-0.5 shrink-0', getKindBgClass(event.kind))}>
                      <EventIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-[12px] font-semibold leading-snug break-words',
                        (event.status === 'completed' || event.status === 'done') && 'line-through text-gray-400'
                      )}>
                        {event.title}
                      </p>
                    {event.leadName && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500 min-w-0">
                        <User className="h-3 w-3 shrink-0" />
                        <p className="truncate">{event.leadName}</p>
                      </div>
                    )}
                    </div>
                  </div>

                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap',
                      event.status === 'completed' || event.status === 'done'
                        ? 'bg-green-100 text-green-700'
                        : event.status === 'live'
                        ? 'bg-rose-100 text-rose-700'
                        : event.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                    )}>
                      <BadgeCheck className="h-3 w-3" />
                      {statusLabels[event.status] || event.status}
                    </span>
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
