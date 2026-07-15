import { format } from 'date-fns'
import { CalendarDays, Palmtree, UserCheck } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

const kindIcon = {
  attendance: UserCheck,
  attendance_team: UserCheck,
  leave: Palmtree,
  holiday: CalendarDays,
}

/** Event chip styling aligned with Calendar EventChip (month / week / day). */
export function HrCalendarEventChip({ event, onClick, view = 'month' }) {
  const color = event.color || '#6366f1'
  const start = event?.start ? new Date(event.start) : null
  const compactTime = start ? format(start, 'HH:mm') : ''
  const Icon = kindIcon[event.kind] || CalendarDays
  const isAllDay = event.allDay !== false

  const handleClick = (e) => {
    e.stopPropagation()
    onClick?.(event)
  }

  const shellClass = cn(
    'w-full cursor-pointer transition-all hover:opacity-95',
    view === 'month' && 'flex items-center gap-1 truncate rounded-sm px-2 py-0.5 text-[11px] font-semibold',
    view === 'week' && 'flex items-start gap-1.5 rounded-md px-2 py-1 text-xs font-semibold shadow-sm',
    view === 'day' && 'flex flex-col gap-1 rounded-md px-2.5 py-2 text-xs font-semibold shadow-sm',
  )

  const shellStyle = {
    backgroundColor: `${color}1f`,
    color,
    borderLeft: `3px solid ${color}`,
  }

  if (view === 'month') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
        className={shellClass}
        style={shellStyle}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <span className="truncate">{event.title}</span>
      </div>
    )
  }

  if (view === 'week') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
        className={cn(shellClass, 'min-w-0')}
        style={shellStyle}
      >
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.title}</span>
          </div>
          {!isAllDay && compactTime ? (
            <div className="mt-0.5 text-[10px] font-medium opacity-90">{compactTime}</div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
      className={shellClass}
      style={shellStyle}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{event.title}</span>
      </div>
      {!isAllDay && start ? <span className="text-[10px] font-medium opacity-80">{format(start, 'h:mm a')}</span> : null}
    </div>
  )
}
