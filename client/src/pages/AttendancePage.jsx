import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Loader } from '@/components/shared/Loader'
import { AttendanceCalendarWorkspace } from '@/features/attendance/components/AttendanceCalendarWorkspace'
import { DayDetailModal } from '@/features/attendance/components/DayDetailModal'
import { MonthlySummaryTable } from '@/features/attendance/components/MonthlySummaryTable'
import { MyAttendanceStats } from '@/features/attendance/components/MyAttendanceStats'
import { HrToolbar, HrToolbarGroup } from '@/features/hr/components/HrToolbar'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrDataTable, HrTableBody, HrTableHead, HrTd, HrTh, HrTr } from '@/features/hr/components/HrDataTable'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'
import {
  useGetAttendanceDayDetailQuery,
  useGetMyAttendanceQuery,
  useGetTeamAttendanceQuery,
  useLazyExportAttendanceCsvQuery,
} from '@/features/attendance/attendanceApi'
import { useIsHrManagerOrAdmin } from '@/features/hr/useHrRole'
import { User } from 'lucide-react'

function formatTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function AttendancePage() {
  const isManager = useIsHrManagerOrAdmin()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [department, setDepartment] = useState('')
  const [dayModal, setDayModal] = useState(null)

  const { data: myData, isLoading: myLoading } = useGetMyAttendanceQuery(
    { year, month },
    { skip: isManager },
  )
  const { data: teamData, isLoading: teamLoading } = useGetTeamAttendanceQuery(
    { year, month, department: department || undefined },
    { skip: !isManager },
  )
  const { data: dayData, isFetching: dayLoading } = useGetAttendanceDayDetailQuery(dayModal, { skip: !dayModal })

  const [exportCsv] = useLazyExportAttendanceCsvQuery()

  const logs = isManager ? [] : myData?.data?.logs || []
  const stats = myData?.data?.stats || {}
  const calendar = teamData?.data?.calendar || {}
  const summary = teamData?.data?.summary || []

  const departments = useMemo(() => {
    const set = new Set((teamData?.data?.users || []).map((u) => u.department).filter(Boolean))
    return [...set].sort()
  }, [teamData])

  async function onExport() {
    try {
      const csv = await exportCsv({ year, month }).unwrap()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${year}-${month}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    }
  }

  const loading = isManager ? teamLoading : myLoading
  const calendarHeight = isManager ? 'h-[calc(100vh-11rem)]' : 'h-[calc(100vh-22rem)]'

  return (
    <PageShell fullWidth flush>
      <div className="flex min-h-0 flex-col">
        {isManager ? (
          <div className="shrink-0 border-b border-surface-border bg-white px-4 py-3 sm:px-6">
            <HrToolbar className="!mb-0">
              <HrToolbarGroup label="Department">
                {departments.length ? (
                  <Select className="h-10 w-44" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="">All departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                ) : null}
              </HrToolbarGroup>
              <Button type="button" variant="secondary" className="!h-10 gap-2" onClick={onExport}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </HrToolbar>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-1 justify-center py-16">
            <Loader />
          </div>
        ) : (
          <>
            {!isManager ? (
              <div className="shrink-0 space-y-4 px-4 py-4 sm:px-6">
                <MyAttendanceStats stats={stats} totalHours={stats.totalHours} />
              </div>
            ) : null}

            <AttendanceCalendarWorkspace
              className={calendarHeight}
              mode={isManager ? 'team' : 'personal'}
              logs={logs}
              calendar={calendar}
              syncPeriod={{ year, month }}
              onPeriodChange={(y, m) => {
                setYear(y)
                setMonth(m)
              }}
              onDayClick={isManager ? setDayModal : undefined}
            />

            {isManager ? (
              <div className="shrink-0 space-y-4 px-4 py-4 sm:px-6">
                <MonthlySummaryTable summary={summary} />
              </div>
            ) : (
              <div className="shrink-0 px-4 pb-6 sm:px-6">
                <HrCard
                  title="Daily log"
                  description="Check-in and check-out times for this month"
                  icon={User}
                  flush
                  bodyClassName="p-0"
                >
                  <HrDataTable minWidth="600px">
                    <HrTableHead>
                      <HrTh>Date</HrTh>
                      <HrTh>Check in</HrTh>
                      <HrTh>Check out</HrTh>
                      <HrTh>Hours</HrTh>
                      <HrTh>Status</HrTh>
                    </HrTableHead>
                    <HrTableBody>
                      {logs.map((log) => (
                        <HrTr key={log.id}>
                          <HrTd className="font-medium tabular-nums">{log.date}</HrTd>
                          <HrTd muted>{formatTime(log.checkInTime)}</HrTd>
                          <HrTd muted>{formatTime(log.checkOutTime)}</HrTd>
                          <HrTd className="tabular-nums font-medium">
                            {log.totalHours != null ? Number(log.totalHours).toFixed(2) : '—'}
                          </HrTd>
                          <HrTd>
                            <HrStatusPill status={log.status} kind="attendance" />
                          </HrTd>
                        </HrTr>
                      ))}
                    </HrTableBody>
                  </HrDataTable>
                </HrCard>
              </div>
            )}
          </>
        )}

        <DayDetailModal
          open={Boolean(dayModal)}
          onClose={() => setDayModal(null)}
          date={dayModal}
          rows={dayData?.data?.rows || []}
          loading={dayLoading}
        />
      </div>
    </PageShell>
  )
}
