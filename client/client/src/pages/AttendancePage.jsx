import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, User, Users } from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { SkeletonCalendar, SkeletonTable } from '@/components/shared/SkeletonLoader'
import { AttendanceCalendarWorkspace } from '@/features/attendance/components/AttendanceCalendarWorkspace'
import { AttendanceUserCalendar } from '@/features/attendance/components/AttendanceUserCalendar'
import { DayDetailModal } from '@/features/attendance/components/DayDetailModal'
import { MonthlySummaryTable } from '@/features/attendance/components/MonthlySummaryTable'
import { MyAttendanceStats } from '@/features/attendance/components/MyAttendanceStats'
import { HrToolbar, HrToolbarGroup } from '@/features/hr/components/HrToolbar'
import { HrCard } from '@/features/hr/components/HrCard'
import { DataGrid } from '@/components/shared/DataGrid'
import { HrStatusPill } from '@/features/hr/components/HrStatusPill'
import {
  useGetAttendanceDayDetailQuery,
  useGetMyAttendanceQuery,
  useGetTeamAttendanceQuery,
  useLazyExportAttendanceCsvQuery,
} from '@/features/attendance/attendanceApi'
import { useGetLeaveSettingsQuery } from '@/features/leave/leaveApi'
import { useIsHrManagerOrAdmin } from '@/features/hr/useHrRole'
import { cn } from '@/utils/cn'

const MY_LOG_COLUMNS = [
  { accessorKey: 'date', header: 'Date', size: 120 },
  {
    id: 'checkInTime',
    header: 'Check in',
    size: 110,
    accessorFn: (row) => formatTime(row.checkInTime),
  },
  {
    id: 'checkOutTime',
    header: 'Check out',
    size: 110,
    accessorFn: (row) => formatTime(row.checkOutTime),
  },
  {
    id: 'totalHours',
    header: 'Hours',
    size: 90,
    accessorFn: (row) => (row.totalHours != null ? Number(row.totalHours).toFixed(2) : '—'),
  },
  {
    id: 'status',
    header: 'Status',
    size: 120,
    cell: ({ row }) => <HrStatusPill status={row.original.status} kind="attendance" />,
    enableSorting: false,
  },
]

const MONTH_OPTIONS = [
  { value: 1,  label: 'January' },
  { value: 2,  label: 'February' },
  { value: 3,  label: 'March' },
  { value: 4,  label: 'April' },
  { value: 5,  label: 'May' },
  { value: 6,  label: 'June' },
  { value: 7,  label: 'July' },
  { value: 8,  label: 'August' },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

function formatTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 rounded-lg px-3 text-xs font-medium transition-colors',
        active
          ? 'bg-white text-brand-700 shadow-sm ring-1 ring-surface-border'
          : 'text-ink-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

export function AttendancePage() {
  const isManager = useIsHrManagerOrAdmin()
  const now = new Date()
  const [tab, setTab] = useState(isManager ? 'team' : 'my')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [department, setDepartment] = useState('')
  const [userId, setUserId] = useState('')
  const [dayModal, setDayModal] = useState(null)

  const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const { data: settingsData } = useGetLeaveSettingsQuery()
  const weeklyOffDays = settingsData?.data?.weeklyOffDays ?? [0, 6]

  const { data: myData, isLoading: myLoading } = useGetMyAttendanceQuery({ year, month })

  const { data: teamData, isLoading: teamLoading } = useGetTeamAttendanceQuery(
    { year, month, department: department || undefined },
    { skip: tab !== 'team' || !isManager },
  )
  const { data: userDetailData, isLoading: userDetailLoading } = useGetTeamAttendanceQuery(
    { year, month, userId },
    { skip: tab !== 'team' || !isManager || !userId },
  )
  const { data: dayData, isFetching: dayLoading } = useGetAttendanceDayDetailQuery(dayModal, {
    skip: !dayModal,
  })

  const [exportCsv] = useLazyExportAttendanceCsvQuery()

  const myLogs = myData?.data?.logs || []
  const myStats = myData?.data?.stats || {}
  const calendar = teamData?.data?.calendar || {}
  const summary = teamData?.data?.summary || []

  const departments = useMemo(() => {
    const set = new Set((teamData?.data?.users || []).map((u) => u.department).filter(Boolean))
    return [...set].sort()
  }, [teamData])

  const users = useMemo(() => teamData?.data?.users || [], [teamData])
  const selectedUser = users.find((u) => u.id === userId)
  const userLogs = userDetailData?.data?.logs || []

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

  function handleUserSelect(uid) {
    setUserId(uid)
    setTab('team')
  }

  return (
    <PageShell fullWidth>
      <div>
        {/* Sticky top bar: tabs + filters */}
        <div className="sticky top-0 z-10 border-b border-surface-border bg-white px-2 py-2">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-surface-subtle p-1">
              <TabButton active={tab === 'my'} onClick={() => setTab('my')}>
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  My Attendance
                </span>
              </TabButton>
              {isManager && (
                <TabButton active={tab === 'team'} onClick={() => setTab('team')}>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Team
                  </span>
                </TabButton>
              )}
            </div>

            {/* Month / Year / Dept / Member filters */}
            <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-2">
              <HrToolbarGroup label="Month" inline>
                <Select
                  className="h-9 w-[7.5rem]"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
              </HrToolbarGroup>
              <HrToolbarGroup label="Year" inline>
                <Select
                  className="h-9 w-[4.5rem]"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </Select>
              </HrToolbarGroup>

              {tab === 'team' && isManager && (
                <>
                  {departments.length > 0 && (
                    <HrToolbarGroup label="Dept" inline>
                      <Select
                        className="h-9 w-36"
                        value={department}
                        onChange={(e) => {
                          setDepartment(e.target.value)
                          setUserId('')
                        }}
                      >
                        <option value="">All</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </Select>
                    </HrToolbarGroup>
                  )}
                  <HrToolbarGroup label="Member" inline>
                    <Select
                      className="h-9 min-w-[9rem] max-w-[11rem]"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                    >
                      <option value="">All members</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </Select>
                  </HrToolbarGroup>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!h-9 shrink-0 px-3.5"
                    onClick={onExport}
                  >
                    <Download className="h-4 w-4 shrink-0" />
                    Export CSV
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* My Attendance tab */}
        {tab === 'my' && (
          myLoading ? (
            <div className="px-2 py-2">
              <div className="space-y-5">
                <SkeletonCalendar />
                <SkeletonTable cols={4} rows={6} />
              </div>
            </div>
          ) : (
            <div className="px-2 py-2">
              <div className="space-y-5">
                <MyAttendanceStats stats={myStats} totalHours={myStats.totalHours} />
                <AttendanceUserCalendar
                  logs={myLogs}
                  year={year}
                  month={month}
                  weeklyOffDays={weeklyOffDays}
                />
                <HrCard
                  title="Daily log"
                  description="Check-in and check-out times for this month"
                  icon={User}
                  flush
                  bodyClassName="p-0"
                >
                  <DataGrid
                    columns={MY_LOG_COLUMNS}
                    data={myLogs}
                    searchable={false}
                    showColumnToggle={false}
                    showExportCsv={false}
                    defaultPageSize={15}
                    hideFooter={myLogs.length <= 15}
                    maxHeightClass="max-h-[min(50vh,400px)]"
                    emptyTitle="No daily logs"
                    className="border-0 shadow-none"
                  />
                </HrCard>
              </div>
            </div>
          )
        )}

        {/* Team tab */}
        {tab === 'team' && isManager && (
          teamLoading ? (
            <div className="px-2 py-2">
              <div className="space-y-5">
                <SkeletonCalendar />
                <SkeletonTable cols={5} rows={6} />
              </div>
            </div>
          ) : userId ? (
            <div className="px-2 py-2">
              {userDetailLoading ? (
                <div className="space-y-5">
                  <SkeletonCalendar />
                  <SkeletonTable cols={4} rows={5} />
                </div>
              ) : (
                <AttendanceUserCalendar
                  logs={userLogs}
                  year={year}
                  month={month}
                  userName={selectedUser?.name}
                  weeklyOffDays={weeklyOffDays}
                />
              )}
            </div>
          ) : (
            <div className="px-2 py-2">
              <div className="space-y-5">
                <AttendanceCalendarWorkspace
                  className="h-[640px]"
                  mode="team"
                  logs={[]}
                  calendar={calendar}
                  weeklyOffDays={weeklyOffDays}
                  syncPeriod={{ year, month }}
                  onPeriodChange={(y, m) => {
                    setYear(y)
                    setMonth(m)
                  }}
                  onDayClick={setDayModal}
                />
                <MonthlySummaryTable
                  summary={summary}
                  onUserSelect={handleUserSelect}
                />
              </div>
            </div>
          )
        )}
      </div>

      <DayDetailModal
        open={Boolean(dayModal)}
        onClose={() => setDayModal(null)}
        date={dayModal}
        rows={dayData?.data?.rows || []}
        loading={dayLoading}
      />
    </PageShell>
  )
}
