import { format, isSameDay, addDays } from 'date-fns'
import { Video, CheckSquare, Phone, TrendingUp, Bell, CalendarClock, CalendarDays, CheckCircle2, Clock, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'
import { getKindBgClass } from '../eventColors'
import { statusPillClass } from './TodayList'

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

export function DayNotesPanel({ selectedDate, events, onEventClick, showSchedule = true }) {
  // Filter events for the selected date
  const dayEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    return isSameDay(eventDate, selectedDate)
  })

  // Calculate week stats
  const weekStart = addDays(selectedDate, -selectedDate.getDay() + 1)
  const weekEvents = events.filter(e => {
    const eventDate = new Date(e.start)
    const diffDays = Math.floor((eventDate - weekStart) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays < 7
  })

  const weekStats = {
    total: weekEvents.length,
    today: dayEvents.length,
    completed: weekEvents.filter(e =>
      e.status === 'completed' || e.status === 'done'
    ).length,
    scheduled: weekEvents.filter(e =>
      ['scheduled', 'pending', 'open', 'in_progress'].includes(e.status)
    ).length,
  }

  const isBusy = dayEvents.length > 3

  const statCards = [
    { label: 'Events', value: weekStats.total, Icon: CalendarDays, tint: 'text-gray-900', iconClass: 'bg-gray-100 text-gray-500' },
    { label: 'Today', value: weekStats.today, Icon: Clock, tint: 'text-brand-600', iconClass: 'bg-brand-100 text-brand-600' },
    { label: 'Completed', value: weekStats.completed, Icon: CheckCircle2, tint: 'text-emerald-600', iconClass: 'bg-emerald-100 text-emerald-600' },
    { label: 'Scheduled', value: weekStats.scheduled, Icon: CalendarClock, tint: 'text-amber-600', iconClass: 'bg-amber-100 text-amber-600' },
  ]

  return (
    <div className="space-y-4">
      {/* Day summary card */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-fuchsia-50/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">{format(selectedDate, 'EEEE')}</p>
            <p className="mt-0.5 text-2xl font-bold text-gray-900">{format(selectedDate, 'd MMMM')}</p>
          </div>
          <div className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
            isBusy ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-emerald-100 text-emerald-700 ring-emerald-200',
          )}>
            {isBusy ? 'Busy day' : 'Free'}
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'} scheduled
        </p>
      </div>

      {/* Week stats */}
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">This Week</h4>
        <div className="grid grid-cols-2 gap-2.5">
          {statCards.map(({ label, value, Icon, tint, iconClass }) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <span className={cn('text-2xl font-bold tabular-nums', tint)}>{value}</span>
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', iconClass)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Day events detail */}
      {showSchedule && (
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Schedule</h4>
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center">
            <CalendarClock className="h-8 w-8 text-gray-300" />
            <p className="text-xs font-medium text-gray-400">No events for this day</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map(event => {
              const EventIcon = iconMap[event.kind] || Bell
              const isCompleted = event.status === 'completed' || event.status === 'done'

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className={cn(
                    'group relative cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white py-2.5 pl-4 pr-3 shadow-sm transition-all',
                    'hover:-translate-y-px hover:border-brand-200 hover:shadow-md',
                  )}
                >
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
                        <h5 className={cn('truncate text-[13px] font-semibold text-gray-900', isCompleted && 'text-gray-400 line-through')}>
                          {event.title}
                        </h5>
                        <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', statusPillClass(event.status))}>
                          {statusLabels[event.status] || event.status}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start), 'h:mm a')}
                        {event.end && event.kind === 'meeting' && (
                          <> – {format(new Date(event.end), 'h:mm a')}</>
                        )}
                      </div>

                      {event.leadName && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{event.leadName}</span>
                        </div>
                      )}

                      {/* Checklist items based on event type */}
                      {event.kind === 'task' && event.meta?.description && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-600">
                            {event.meta.description}
                          </p>
                        </div>
                      )}

                      {event.kind === 'task' && Array.isArray(event.meta?.attachments) && event.meta.attachments.length ? (
                        <div className="mt-2 border-t border-gray-100 pt-2">
                          <TaskAttachmentIcons attachments={event.meta.attachments} variant="compact" />
                        </div>
                      ) : null}

                      {event.kind === 'reminder' && event.meta?.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-600">
                            {event.meta.notes}
                          </p>
                        </div>
                      )}

                      {event.kind === 'meeting' && event.meta?.agenda && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {event.meta.agenda}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
