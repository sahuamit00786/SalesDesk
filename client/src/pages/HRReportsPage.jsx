import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BarChart2, Building2, CalendarCheck, CalendarDays,
  ChevronDown, Download, TrendingDown, TrendingUp, Umbrella, Users,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { PageShell } from '@/components/layout/PageShell'
import { ReportKpiCard } from '@/features/analytics/components/ReportKpiCard'
import { useGetAllLeavesQuery, useGetLeaveTypesQuery, useGetPublicHolidaysQuery } from '@/features/leave/leaveApi'
import { useGetTeamAttendanceQuery } from '@/features/attendance/attendanceApi'
import { useIsHrManagerOrAdmin } from '@/features/hr/useHrRole'
import { cn } from '@/utils/cn'

const NOW = new Date()
const YEAR = NOW.getFullYear()
const MONTH = NOW.getMonth() + 1

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9']

const STATUS_COLORS = {
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  cancelled: '#94a3b8',
}

const STATUS_LABELS = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

function SectionHeading({ children, className }) {
  return (
    <h2 className={cn('mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-faint', className)}>
      {children}
    </h2>
  )
}

function ChartCard({ title, children, className }) {
  return (
    <div className={cn('rounded-2xl border border-surface-border bg-white p-5 shadow-sm', className)}>
      {title && <p className="mb-4 text-sm font-semibold text-ink">{title}</p>}
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = {
    approved: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    rejected: 'bg-rose-50 text-rose-700',
    cancelled: 'bg-slate-100 text-ink-muted',
  }
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', colors[status] || colors.cancelled)}>
      {status}
    </span>
  )
}

function MonthPicker({ year, month, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => onChange(year, Number(e.target.value))}
        className="h-9 rounded-xl border border-surface-border bg-white px-3 text-sm font-medium text-ink shadow-sm"
      >
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(Number(e.target.value), month)}
        className="h-9 rounded-xl border border-surface-border bg-white px-3 text-sm font-medium text-ink shadow-sm"
      >
        {[YEAR - 1, YEAR, YEAR + 1].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}

function pad(n) { return String(n).padStart(2, '0') }

export function HRReportsPage() {
  const navigate = useNavigate()
  const isManager = useIsHrManagerOrAdmin()

  const [selYear, setSelYear] = useState(YEAR)
  const [selMonth, setSelMonth] = useState(MONTH)

  const from = `${selYear}-${pad(selMonth)}-01`
  const lastDay = new Date(selYear, selMonth, 0).getDate()
  const to = `${selYear}-${pad(selMonth)}-${lastDay}`

  const { data: allLeavesData } = useGetAllLeavesQuery({ from, to }, { skip: !isManager })
  const { data: typesData } = useGetLeaveTypesQuery()
  const { data: teamAttData } = useGetTeamAttendanceQuery({ year: selYear, month: selMonth }, { skip: !isManager })
  const { data: holidayData } = useGetPublicHolidaysQuery(selYear)

  const leaves = allLeavesData?.data || []
  const types = typesData?.data || []
  const teamSummary = teamAttData?.data?.summary || []
  const holidays = holidayData?.data || []

  // ── KPIs ──
  const totalLeaves = leaves.length
  const approvedLeaves = leaves.filter((l) => l.status === 'approved').length
  const pendingLeaves = leaves.filter((l) => l.status === 'pending').length
  const totalDaysOnLeave = leaves
    .filter((l) => l.status === 'approved')
    .reduce((s, l) => s + Number(l.workingDays || 0), 0)

  // ── Leave by type ──
  const leaveByType = useMemo(() => {
    const map = {}
    for (const t of types) map[t.id] = { name: t.name, approved: 0, pending: 0, rejected: 0 }
    for (const l of leaves) {
      const id = l.leaveTypeId || l.leaveType?.id
      if (!map[id]) map[id] = { name: l.leaveType?.name || 'Unknown', approved: 0, pending: 0, rejected: 0 }
      if (l.status === 'approved') map[id].approved++
      else if (l.status === 'pending') map[id].pending++
      else if (l.status === 'rejected') map[id].rejected++
    }
    return Object.values(map).filter((v) => v.approved + v.pending + v.rejected > 0)
  }, [leaves, types])

  // ── Status distribution ──
  const statusDist = useMemo(() => {
    const map = { approved: 0, pending: 0, rejected: 0, cancelled: 0 }
    for (const l of leaves) if (map[l.status] !== undefined) map[l.status]++
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, status: k }))
  }, [leaves])

  // ── Attendance summary per employee (teamSummary is already aggregated by server) ──
  const attendanceSummary = useMemo(() => {
    return teamSummary
      .map((r) => ({
        name: r.name || 'Unknown',
        present: r.daysPresent || 0,
        absent: r.daysAbsent || 0,
        late: r.daysLate || 0,
        onLeave: 0,
        totalHours: Number(r.totalHours || 0),
      }))
      .sort((a, b) => b.present - a.present)
      .slice(0, 30)
  }, [teamSummary])

  const workingDaysInMonth = useMemo(() => {
    let count = 0
    const holidaySet = new Set(holidays.map((h) => h.date?.slice(0, 10)))
    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(selYear, selMonth - 1, d)
      const day = dt.getDay()
      const key = `${selYear}-${pad(selMonth)}-${pad(d)}`
      if (day !== 0 && day !== 6 && !holidaySet.has(key)) count++
    }
    return count
  }, [selYear, selMonth, lastDay, holidays])

  const avgAttendancePct = useMemo(() => {
    if (!attendanceSummary.length || !workingDaysInMonth) return null
    const avg = attendanceSummary.reduce((s, r) => s + r.present, 0) / attendanceSummary.length
    return Math.round((avg / workingDaysInMonth) * 100)
  }, [attendanceSummary, workingDaysInMonth])

  return (
    <PageShell fullWidth>
      <div className="min-h-full bg-[#f8f9fc] px-4 py-6 sm:px-6">

        {/* ── Top bar ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/hr')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border bg-white text-ink-muted shadow-sm hover:bg-surface-subtle"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm">
              <BarChart2 className="h-5 w-5 text-white" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink">HR Reports</h1>
              <p className="text-xs text-ink-muted">Leave utilization, attendance trends &amp; team analytics</p>
            </div>
          </div>
          <MonthPicker
            year={selYear}
            month={selMonth}
            onChange={(y, m) => { setSelYear(y); setSelMonth(m) }}
          />
        </div>

        {/* ── KPI strip ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ReportKpiCard
            label="Total leave requests"
            value={totalLeaves}
            hint={`${MONTH_NAMES[selMonth - 1]} ${selYear}`}
            icon={Umbrella}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            accentColor="bg-blue-400"
          />
          <ReportKpiCard
            label="Approved leaves"
            value={approvedLeaves}
            hint={`${totalDaysOnLeave} working days`}
            icon={TrendingUp}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            accentColor="bg-emerald-400"
          />
          <ReportKpiCard
            label="Pending approvals"
            value={pendingLeaves}
            hint={pendingLeaves > 0 ? 'Require action' : 'All clear'}
            icon={TrendingDown}
            iconBg={pendingLeaves > 0 ? 'bg-amber-50' : 'bg-slate-50'}
            iconColor={pendingLeaves > 0 ? 'text-amber-600' : 'text-ink-muted'}
            accentColor={pendingLeaves > 0 ? 'bg-amber-400' : 'bg-slate-200'}
          />
          <ReportKpiCard
            label="Avg attendance"
            value={avgAttendancePct != null ? `${avgAttendancePct}%` : '—'}
            hint={workingDaysInMonth ? `${workingDaysInMonth} working days` : undefined}
            icon={CalendarCheck}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
            accentColor="bg-violet-400"
          />
        </div>

        {/* ── Charts row ── */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Leave by type bar chart */}
          <ChartCard title="Leave requests by type" className="lg:col-span-2">
            {leaveByType.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-ink-muted">No leave data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leaveByType} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Status pie */}
          <ChartCard title="Status distribution">
            {statusDist.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-ink-muted">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {statusDist.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Leave request table ── */}
        {isManager && leaves.length > 0 && (
          <div className="mb-6">
            <SectionHeading>Leave requests — {MONTH_NAMES[selMonth - 1]} {selYear}</SectionHeading>
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-subtle text-left">
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Employee</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Type</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">From</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">To</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Days</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {leaves.slice(0, 50).map((l) => (
                      <tr key={l.id} className="hover:bg-surface-subtle/50">
                        <td className="px-4 py-3 font-medium text-ink">
                          {l.user?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {l.leaveType?.name || '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-muted">
                          {l.fromDate || '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-muted">
                          {l.toDate || '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-ink">
                          {l.workingDays != null ? l.workingDays : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={l.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {leaves.length > 50 && (
                <div className="border-t border-surface-border px-4 py-2 text-xs text-ink-muted">
                  Showing first 50 of {leaves.length} records
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Attendance summary table ── */}
        {isManager && attendanceSummary.length > 0 && (
          <div>
            <SectionHeading>Team attendance — {MONTH_NAMES[selMonth - 1]} {selYear}</SectionHeading>
            <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-subtle text-left">
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Employee</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Present</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Absent</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">On leave</th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {attendanceSummary.map((r, i) => {
                      const total = r.present + r.absent + r.onLeave
                      const pct = total > 0 ? Math.round((r.present / total) * 100) : 0
                      return (
                        <tr key={i} className="hover:bg-surface-subtle/50">
                          <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                          <td className="px-4 py-3 tabular-nums text-emerald-700 font-semibold">{r.present}</td>
                          <td className="px-4 py-3 tabular-nums text-rose-600">{r.absent}</td>
                          <td className="px-4 py-3 tabular-nums text-amber-600">{r.onLeave}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-subtle">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500',
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="tabular-nums text-xs font-semibold text-ink">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Non-manager fallback */}
        {!isManager && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-border bg-white py-16 shadow-sm">
            <Building2 className="mb-3 h-10 w-10 text-ink-faint" strokeWidth={1.3} />
            <p className="text-sm font-semibold text-ink">HR reports are available to managers and admins</p>
            <p className="mt-1 text-xs text-ink-muted">Contact your HR admin for access</p>
          </div>
        )}
      </div>
    </PageShell>
  )
}
