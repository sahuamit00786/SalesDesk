import { useMemo, useCallback, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAppSelector } from '@/app/hooks'
import { AppCalendarShell } from '@/features/calendar/components/AppCalendarShell'
import { HrCalendarEventChip } from '@/features/hr/components/HrCalendarEventChip'
import { HrCalendarLegend } from '@/features/hr/components/HrCalendarLegend'
import { LeaveDayApplyModal } from '@/features/leave/components/LeaveDayApplyModal'
import { LeaveRequestsSidebarPanel } from '@/features/leave/components/LeaveRequestsSidebarPanel'
import { eventDateKey, expandLeavesToDateMap, leaveDataToEvents } from '@/features/hr/utils/hrCalendarEvents'
import { isPastDateKey } from '@/features/leave/utils/leaveDateUtils'

const LEGEND = [
  { key: 'cl', label: 'Casual Leave', dotClassName: 'bg-teal-600' },
  { key: 'sl', label: 'Sick Leave', dotClassName: 'bg-[var(--brand-primary)]' },
  { key: 'ul', label: 'Unpaid Leave', dotClassName: 'bg-rose-900' },
  { key: 'holiday', label: 'Public holiday', dotClassName: 'bg-amber-600' },
  { key: 'pending', label: 'Pending approval', dotClassName: 'bg-amber-400 ring-2 ring-amber-300' },
]

export function LeaveCalendarWorkspace({
  className,
  myLeaves = [],
  teamLeaves = [],
  holidays = [],
  syncPeriod,
  onPeriodChange,
  onApplied,
}) {
  const viewerId = useAppSelector((s) => s.auth.user?.id)
  const [selectedDate, setSelectedDate] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const events = useMemo(
    () => leaveDataToEvents({ myLeaves, teamLeaves, holidays, viewerId }),
    [myLeaves, teamLeaves, holidays, viewerId],
  )

  const leavesByDate = useMemo(
    () => expandLeavesToDateMap([...myLeaves, ...teamLeaves.filter((t) => !myLeaves.some((m) => m.id === t.id))]),
    [myLeaves, teamLeaves],
  )

  const holidayByDate = useMemo(() => {
    const m = {}
    for (const h of holidays) {
      m[String(h.date).slice(0, 10)] = h
    }
    return m
  }, [holidays])

  const openDay = useCallback((dateKey) => {
    if (!dateKey) return
    if (isPastDateKey(dateKey)) {
      toast.error('Cannot apply leave for past dates')
      return
    }
    setSelectedDate(dateKey)
    setModalOpen(true)
  }, [])

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

  const dayLeaves = selectedDate
    ? (leavesByDate[selectedDate] || []).map((r) => ({ ...r, _viewerId: viewerId }))
    : []
  const selectedHoliday = selectedDate ? holidayByDate[selectedDate] : null

  const leftSidebar = (
    <>
      <div className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Legend</p>
        <HrCalendarLegend items={LEGEND} />
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">Click a day or leave block to apply or review leave.</p>
      </div>
      <LeaveRequestsSidebarPanel requests={myLeaves} />
    </>
  )

  return (
    <>
      <AppCalendarShell
        className={className}
        events={events}
        onSelectSlot={handleSlot}
        onSelectEvent={handleEvent}
        EventComponent={EventComponent}
        leftSidebar={leftSidebar}
        showRightPanel={false}
        showTodayList={false}
        selectable
        syncPeriod={syncPeriod}
        onPeriodChange={onPeriodChange}
      />

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
