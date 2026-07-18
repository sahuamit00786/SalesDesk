import { useNavigate } from 'react-router-dom'
import {
  BarChart2, CalendarCheck, CheckCircle2,
  ClipboardList, Clock, ScrollText, SlidersHorizontal, Umbrella,
} from '@/components/ui/icons'
import { PageShell } from '@/components/layout/PageShell'
import { useGetAttendanceTodayQuery, useGetMyAttendanceQuery } from '@/features/attendance/attendanceApi'
import { useGetMyLeaveBalanceQuery, useGetAllLeavesQuery } from '@/features/leave/leaveApi'
import { useIsHrManagerOrAdmin } from '@/features/hr/useHrRole'
import { ReportKpiCard } from '@/features/analytics/components/ReportKpiCard'
import { LeaveApprovalList } from '@/features/leave/components/LeaveApprovalList'
import { cn } from '@/utils/cn'

const BALANCE_COLORS = [
  { bar: 'bg-brand-500', bg: 'bg-brand-50', border: 'border-brand-200/60' },
  { bar: 'bg-violet-500', bg: 'bg-violet-50', border: 'border-violet-200/60' },
  { bar: 'bg-teal-500', bg: 'bg-teal-50', border: 'border-teal-200/60' },
  { bar: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200/60' },
  { bar: 'bg-rose-500', bg: 'bg-rose-50', border: 'border-rose-200/60' },
  { bar: 'bg-sky-500', bg: 'bg-sky-50', border: 'border-sky-200/60' },
]

function QuickCard({ icon: Icon, label, desc, to, gradient, badge }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-surface-border bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm', gradient)}>
        <Icon className="h-5 w-5 text-white" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{label}</p>
        <p className="truncate text-xs text-ink-muted">{desc}</p>
      </div>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

function SectionHeading({ children }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">{children}</h2>
  )
}

export function HRDashboardPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const isManager = useIsHrManagerOrAdmin()

  const { data: todayData } = useGetAttendanceTodayQuery()
  const { data: balanceData } = useGetMyLeaveBalanceQuery(year)
  const { data: pendingData } = useGetAllLeavesQuery({ status: 'pending' }, { skip: !isManager })
  const { data: monthData } = useGetMyAttendanceQuery({ year, month })

  const today = todayData?.data
  const balances = (balanceData?.data || []).filter(
    (b) => b.leaveType?.id || b.leaveType?.name || b.leaveType?.code,
  )
  const pendingCount = pendingData?.data?.length ?? 0
  const monthStats = monthData?.data?.stats || {}
  const presentDays = (monthStats.present || 0) + (monthStats.late || 0)

  const totalAvailable = balances.reduce((s, b) => s + Number(b.available || 0), 0)
  const totalUsed = balances.reduce((s, b) => s + Number(b.used || 0), 0)

  const isPresent = Boolean(today?.checkIn)
  const checkedOut = Boolean(today?.checkOut)

  function fmtTime(iso) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const attendanceHint = isPresent
    ? checkedOut
      ? `In ${fmtTime(today.checkIn)} · Out ${fmtTime(today.checkOut)}`
      : `Checked in at ${fmtTime(today.checkIn)}`
    : 'Not checked in yet'

  return (
    <PageShell fullWidth>
      <div className="min-h-full bg-[#f8f9fc] px-2 py-2">

        {/* ── KPI strip ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReportKpiCard
            label="Today's status"
            value={isPresent ? (checkedOut ? 'Checked out' : 'Present') : 'Absent'}
            hint={attendanceHint}
            icon={isPresent ? CheckCircle2 : Clock}
            iconBg={isPresent ? 'bg-emerald-50' : 'bg-amber-50'}
            iconColor={isPresent ? 'text-emerald-600' : 'text-amber-600'}
            accentColor={isPresent ? 'bg-emerald-400' : 'bg-amber-400'}
          />
          <ReportKpiCard
            label="Available leave"
            value={`${totalAvailable}`}
            hint={`${totalUsed} days used · ${balances.length} type${balances.length !== 1 ? 's' : ''}`}
            icon={Umbrella}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            accentColor="bg-blue-400"
          />
          {isManager ? (
            <ReportKpiCard
              label="Pending approvals"
              value={pendingCount}
              hint={pendingCount > 0 ? 'Require your action' : 'All clear'}
              icon={ClipboardList}
              iconBg={pendingCount > 0 ? 'bg-rose-50' : 'bg-emerald-50'}
              iconColor={pendingCount > 0 ? 'text-rose-600' : 'text-emerald-600'}
              accentColor={pendingCount > 0 ? 'bg-rose-400' : 'bg-emerald-400'}
            />
          ) : (
            <ReportKpiCard
              label="Leave types"
              value={balances.length}
              hint="Configured for your account"
              icon={ScrollText}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              accentColor="bg-violet-400"
            />
          )}
          <ReportKpiCard
            label="This month"
            value={presentDays}
            hint={`${monthStats.absent || 0} absent · ${monthStats.late || 0} late`}
            icon={CalendarCheck}
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
            accentColor="bg-teal-400"
          />
        </div>

        {/* ── Quick actions ── */}
        <SectionHeading>Quick actions</SectionHeading>
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickCard
            to="/attendance"
            icon={CalendarCheck}
            label="Attendance"
            desc="Check in, monthly log, team calendar"
            gradient="from-emerald-500 to-teal-600"
          />
          <QuickCard
            to="/leave"
            icon={Umbrella}
            label="Apply for leave"
            desc="Submit a new leave request"
            gradient="from-blue-500 to-indigo-600"
          />
          <QuickCard
            to="/leave/requests"
            icon={ScrollText}
            label="My leave requests"
            desc="Track your submitted leave history"
            gradient="from-violet-500 to-purple-600"
          />
          {isManager && (
            <QuickCard
              to="/leave/approval"
              icon={ClipboardList}
              label="Approval queue"
              desc="Review and action team requests"
              gradient="from-rose-500 to-pink-600"
              badge={pendingCount}
            />
          )}
          {isManager && (
            <QuickCard
              to="/leave/config"
              icon={SlidersHorizontal}
              label="Leave settings"
              desc="Leave types, holidays, balances"
              gradient="from-amber-500 to-orange-500"
            />
          )}
          <QuickCard
            to="/hr/reports"
            icon={BarChart2}
            label="HR Reports"
            desc="Attendance & leave analytics"
            gradient="from-indigo-500 to-blue-600"
          />
        </div>

        {/* ── Pending Approvals (managers only) ── */}
        {isManager && pendingCount > 0 ? (
          <div className="mb-8">
            <SectionHeading>Pending approvals ({pendingCount})</SectionHeading>
            <LeaveApprovalList />
          </div>
        ) : null}

        {/* ── Leave balance ── */}
        {balances.length > 0 && (
          <>
            <SectionHeading>Leave balance — {year}</SectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {balances.map((b, i) => {
                const avail = Number(b.available || 0)
                const alloc = Number(b.allocated || 0)
                const used = Number(b.used || 0)
                const pending = Number(b.pending || 0)
                const pct = alloc > 0 ? Math.min(Math.round((used / alloc) * 100), 100) : 0
                const color = BALANCE_COLORS[i % BALANCE_COLORS.length]
                return (
                  <div
                    key={b.id}
                    className={cn(
                      'rounded-2xl border bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.04]',
                      color.border,
                    )}
                  >
                    <div className={cn('mb-2 inline-flex rounded-lg px-2.5 py-1', color.bg)}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink">
                        {b.leaveType?.name || b.leaveType?.code || 'Leave'}
                      </p>
                    </div>
                    <div className="flex items-end gap-1.5">
                      <span className="text-2xl font-extrabold tabular-nums leading-none text-ink">
                        {avail}
                      </span>
                      <span className="mb-0.5 text-sm text-ink-muted">/ {alloc} days left</span>
                    </div>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', color.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
                      <span>{pct}% used</span>
                      <span>{used} used · {pending} pending</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}
