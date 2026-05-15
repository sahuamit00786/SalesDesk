import { useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { AppCalendarShell } from '@/features/calendar/components/AppCalendarShell'
import { HrCalendarEventChip } from '@/features/hr/components/HrCalendarEventChip'
import { HrCalendarLegend } from '@/features/hr/components/HrCalendarLegend'
import {
  eventDateKey,
  personalAttendanceToEvents,
  teamAttendanceToEvents,
} from '@/features/hr/utils/hrCalendarEvents'

const LEGEND_PERSONAL = [
  { key: 'present', label: 'Present', dotClassName: 'bg-emerald-400 border-emerald-300' },
  { key: 'absent', label: 'Absent', dotClassName: 'bg-rose-400 border-rose-300' },
  { key: 'late', label: 'Late', dotClassName: 'bg-amber-400 border-amber-300' },
  { key: 'half_day', label: 'Half day', dotClassName: 'bg-sky-400 border-sky-300' },
]

const LEGEND_TEAM = [
  ...LEGEND_PERSONAL,
  { key: 'on_leave', label: 'On leave', dotClassName: 'bg-violet-400 border-violet-300' },
]

export function AttendanceCalendarWorkspace({
  className,
  mode = 'personal',
  logs = [],
  calendar = {},
  syncPeriod,
  onPeriodChange,
  onDayClick,
}) {
  const events = useMemo(() => {
    if (mode === 'team') return teamAttendanceToEvents(calendar)
    return personalAttendanceToEvents(logs)
  }, [mode, logs, calendar])

  const legend = mode === 'team' ? LEGEND_TEAM : LEGEND_PERSONAL

  const openDay = useCallback(
    (dateKey) => {
      if (dateKey) onDayClick?.(dateKey)
    },
    [onDayClick],
  )

  const handleSlot = useCallback(
    (slotInfo) => {
      openDay(format(slotInfo.start, 'yyyy-MM-dd'))
    },
    [openDay],
  )

  const handleEvent = useCallback(
    (event) => {
      openDay(eventDateKey(event))
    },
    [openDay],
  )

  const EventComponent = useCallback(
    ({ event, view }) => <HrCalendarEventChip event={event} view={view} onClick={handleEvent} />,
    [handleEvent],
  )

  const leftSidebar = (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Legend</p>
      <HrCalendarLegend items={legend} />
      {mode === 'team' ? (
        <p className="mt-3 text-xs leading-relaxed text-gray-500">Click a day or event to view team attendance details.</p>
      ) : null}
    </div>
  )

  return (
    <AppCalendarShell
      className={className}
      events={events}
      onSelectSlot={onDayClick ? handleSlot : undefined}
      onSelectEvent={onDayClick ? handleEvent : undefined}
      EventComponent={EventComponent}
      leftSidebar={leftSidebar}
      showRightPanel={false}
      selectable={Boolean(onDayClick)}
      syncPeriod={syncPeriod}
      onPeriodChange={onPeriodChange}
    />
  )
}
