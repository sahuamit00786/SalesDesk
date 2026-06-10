import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import { MonthGridCalendar } from '@/features/calendar/components/MonthGridCalendar'
import { HrCalendarLegend } from '@/features/hr/components/HrCalendarLegend'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'
import { ATTENDANCE_CELL_STYLES } from '@/features/hr/constants/statusStyles'
import { AttendanceTeamDayStats } from '@/features/attendance/components/AttendanceTeamDayStats'

const LEGEND_PERSONAL = [
  { key: 'present', label: 'Present', dotClassName: 'bg-emerald-400 border-emerald-300' },
  { key: 'absent', label: 'Absent', dotClassName: 'bg-rose-400 border-rose-300' },
  { key: 'late', label: 'Late', dotClassName: 'bg-amber-400 border-amber-300' },
  { key: 'half_day', label: 'Half day', dotClassName: 'bg-sky-400 border-sky-300' },
]

const LEGEND_TEAM = [
  ...LEGEND_PERSONAL,
  { key: 'on_leave', label: 'On leave', dotClassName: 'bg-violet-400 border-brand-300' },
]

function formatCheckIn(v) {
  if (!v) return null
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function AttendanceCalendar({
  year,
  month,
  logs = [],
  calendar = {},
  onDayClick,
  onMonthChange,
  mode = 'personal',
}) {
  const logByDate = useMemo(() => {
    const m = {}
    for (const log of logs) {
      m[String(log.date).slice(0, 10)] = log
    }
    return m
  }, [logs])

  const legend = mode === 'team' ? LEGEND_TEAM : LEGEND_PERSONAL

  return (
    <MonthGridCalendar
      year={year}
      month={month}
      onMonthChange={onMonthChange}
      onDayClick={onDayClick ? (key) => onDayClick(key) : undefined}
      headerExtra={<HrCalendarLegend items={legend} className="hidden sm:flex" />}
      renderDayContent={(cell) => {
        if (cell.outside) return null

        const key = cell.key
        const log = logByDate[key]
        const team = calendar[key]
        const status = log?.status
        const cellStyle = status ? ATTENDANCE_CELL_STYLES[status] : null

        if (mode === 'team') {
          if (!team) return null
          return (
            <div className={cn('rounded-lg p-0.5', cellStyle)}>
              <AttendanceTeamDayStats team={team} />
            </div>
          )
        }

        if (!log) return null

        return (
          <div className={cn('flex flex-col gap-1 rounded-lg p-0.5', cellStyle)}>
            {status ? <HrStatusPill status={status} kind="attendance" className="!text-[10px] !px-1.5 !py-0" /> : null}
            {log.checkInTime ? (
              <p className="text-[10px] font-medium text-gray-600">In {formatCheckIn(log.checkInTime)}</p>
            ) : null}
          </div>
        )
      }}
    />
  )
}
