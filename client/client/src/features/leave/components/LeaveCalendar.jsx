import { useMemo, useState } from 'react'
import { useAppSelector } from '@/app/hooks'
import { MonthGridCalendar } from '@/features/calendar/components/MonthGridCalendar'
import { LeaveDayApplyModal } from '@/features/leave/components/LeaveDayApplyModal'
import { HolidayBadge, LeaveCalendarBadge, LeaveTypeBadge } from '@/features/leave/components/LeaveCalendarBadge'
import { getLeaveTypeStyle } from '@/features/leave/constants/leaveTypeStyles'
import { HrCalendarLegend } from '@/features/hr/components/HrCalendarLegend'

const LEGEND = [
  { key: 'cl', label: 'Casual Leave', dotClassName: 'bg-teal-600' },
  { key: 'sl', label: 'Sick Leave', dotClassName: 'bg-[var(--brand-primary)]' },
  { key: 'ul', label: 'Unpaid Leave', dotClassName: 'bg-rose-900' },
  { key: 'holiday', label: 'Public holiday', dotClassName: 'bg-amber-600' },
  { key: 'pending', label: 'Pending approval', dotClassName: 'bg-amber-400 ring-2 ring-amber-300' },
]

function expandLeavesToDates(requests) {
  const map = {}
  for (const req of requests) {
    if (req.status === 'rejected' || req.status === 'cancelled') continue
    const start = new Date(`${String(req.fromDate).slice(0, 10)}T12:00:00`)
    const end = new Date(`${String(req.toDate).slice(0, 10)}T12:00:00`)
    const cur = new Date(start)
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(req)
      cur.setDate(cur.getDate() + 1)
    }
  }
  return map
}

export function LeaveCalendar({
  year: initialYear,
  month: initialMonth,
  onMonthChange,
  myLeaves = [],
  teamLeaves = [],
  holidays = [],
  onApplied,
}) {
  const viewerId = useAppSelector((s) => s.auth.user?.id)

  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const displayYear = onMonthChange ? initialYear : year
  const displayMonth = onMonthChange ? initialMonth : month

  const holidayByDate = useMemo(() => {
    const m = {}
    for (const h of holidays) {
      m[String(h.date).slice(0, 10)] = h
    }
    return m
  }, [holidays])

  const leavesByDate = useMemo(() => {
    const merged = [...myLeaves, ...teamLeaves.filter((t) => !myLeaves.some((m) => m.id === t.id))]
    return expandLeavesToDates(merged)
  }, [myLeaves, teamLeaves])

  function handleMonthChange(y, m) {
    if (onMonthChange) onMonthChange(y, m)
    else {
      setYear(y)
      setMonth(m)
    }
  }

  function openDay(key) {
    setSelectedDate(key)
    setModalOpen(true)
  }

  const dayLeaves = selectedDate
    ? (leavesByDate[selectedDate] || []).map((r) => ({ ...r, _viewerId: viewerId }))
    : []
  const selectedHoliday = selectedDate ? holidayByDate[selectedDate] : null

  return (
    <>
      <MonthGridCalendar
        year={displayYear}
        month={displayMonth}
        onMonthChange={handleMonthChange}
        onDayClick={(key) => openDay(key)}
        headerExtra={<HrCalendarLegend items={LEGEND} className="hidden sm:flex" />}
        renderDayContent={(cell) => {
          const key = cell.key
          const list = leavesByDate[key] || []
          const holiday = holidayByDate[key]
          const myOnDay = list.filter((r) => String(r.userId) === String(viewerId))
          const othersOnDay = list.filter((r) => String(r.userId) !== String(viewerId))

          return (
            <>
              {holiday ? <HolidayBadge name={holiday.name} /> : null}
              {myOnDay.slice(0, holiday ? 2 : 3).map((req) => (
                <LeaveTypeBadge key={req.id} leaveType={req.leaveType} status={req.status} />
              ))}
              {othersOnDay.slice(0, 1).map((req) => {
                const style = getLeaveTypeStyle(req.leaveType)
                const who = req.user?.name?.split(' ')[0] || 'Team'
                return (
                  <LeaveCalendarBadge
                    key={req.id}
                    label={`${who} · ${style.label}`}
                    bgClass={style.bg}
                    pending={req.status === 'pending'}
                  />
                )
              })}
              {myOnDay.length + othersOnDay.length > 3 ? (
                <span className="text-center text-[9px] font-medium text-gray-500">
                  +{myOnDay.length + othersOnDay.length - 3}
                </span>
              ) : null}
            </>
          )
        }}
      />

      <div className="mt-2 sm:hidden">
        <HrCalendarLegend items={LEGEND} />
      </div>

      <LeaveDayApplyModal
        open={modalOpen}
        date={selectedDate}
        holiday={selectedHoliday}
        dayLeaves={dayLeaves}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          onApplied?.()
        }}
      />
    </>
  )
}
