import { format, isSameDay, addDays } from 'date-fns'
import { Video, CheckSquare, Phone, TrendingUp, Bell, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'
import { TaskAttachmentIcons } from '@/features/leads/components/TaskAttachmentIcons'
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

export function DayNotesPanel({ selectedDate, events, onEventClick }) {
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

  return (
    <div className="space-y-5">
      {/* Day summary card */}
      <div className="bg-white/90 backdrop-blur rounded-2xl p-4 border border-brand-100 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{format(selectedDate, 'EEEE')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {format(selectedDate, 'd MMMM')}
            </p>
          </div>
          <div className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            isBusy ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          )}>
            {isBusy ? 'Busy day' : 'Free'}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {dayEvents.length} events scheduled
        </p>
      </div>

      {/* Week stats */}
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          This Week
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{weekStats.total}</p>
            <p className="text-xs text-gray-500">Events</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{weekStats.today}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-600">{weekStats.completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-brand-600">{weekStats.scheduled}</p>
            <p className="text-xs text-gray-500">Scheduled</p>
          </div>
        </div>
      </div>

      {/* Day events detail */}
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Schedule
        </h4>
        {dayEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No events for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(event => {
              const EventIcon = iconMap[event.kind] || Bell
              const isCompleted = event.status === 'completed' || event.status === 'done'

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className={cn(
                    'bg-white border border-gray-100 rounded-lg p-3 cursor-pointer',
                    'hover:border-brand-200 hover:shadow-sm transition-all'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-lg', getKindBgClass(event.kind))}>
                      <EventIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className={cn(
                          'font-medium text-sm truncate',
                          isCompleted && 'line-through text-gray-400'
                        )}>
                          {event.title}
                        </h5>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0',
                          isCompleted
                            ? 'bg-green-100 text-green-700'
                            : event.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-brand-100 text-brand-700'
                        )}>
                          {statusLabels[event.status] || event.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.start), 'h:mm a')}
                        {event.end && event.kind === 'meeting' && (
                          <> - {format(new Date(event.end), 'h:mm a')}</>
                        )}
                      </div>

                      {event.leadName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Lead: {event.leadName}
                        </p>
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
    </div>
  )
}
