import { Users, TrendingUp, DollarSign, Trophy, Percent, Megaphone, CheckSquare, AlertTriangle, ListTodo, BadgeDollarSign } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import {
  useGetLeadsReportQuery, useGetDealsReportQuery,
  useGetActivitiesReportQuery, useGetTasksReportQuery, useGetTeamReportQuery,
} from '@/features/analytics/analyticsApi'
import { ASSIGNEE_WORKLOAD_COLS } from '@/features/analytics/reportColumns'

const SLICES = CHART_COLORS.slices

export function OverviewTab({ queryParams, from, to }) {
  const fmtMoney = useFormatChartCurrency()
  const params = queryParams || { from, to }
  const { data: leadsData, isLoading: l1 } = useGetLeadsReportQuery(params)
  const { data: dealsData, isLoading: l2 } = useGetDealsReportQuery(params)
  const { data: actData, isLoading: l3 } = useGetActivitiesReportQuery(params)
  const { data: tasksData, isLoading: l4 } = useGetTasksReportQuery(params)
  const { data: teamData, isLoading: l5 } = useGetTeamReportQuery(params)

  const leads = leadsData?.data
  const deals = dealsData?.data
  const act = actData?.data
  const tasks = tasksData?.data
  const team = teamData?.data
  const loading = l1 || l2 || l3 || l4 || l5

  const assigneeWorkload = tasks?.tables?.assigneeWorkload || []
  const overduePreview = (tasks?.tables?.overdue || []).slice(0, 8)

  // Build combined source data with conversion
  const sourceDist = leads?.charts?.sourceDist || []

  // Activity strip data
  const actKpis = act?.kpis || {}

  return (
    <div id="report-export-root" className="space-y-6">

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading ? Array.from({ length: 10 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total Leads" value={leads?.kpis?.total ?? 0} icon={Users} />
          <ReportKpiCard label="New (period)" value={leads?.kpis?.newInPeriod ?? 0} icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="Stale leads" value={leads?.kpis?.staleLeads ?? 0} sub="No activity 14d" icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Pipeline value" value={fmtMoney(deals?.kpis?.pipelineValue ?? 0)} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Won value" value={fmtMoney(deals?.kpis?.wonValue ?? 0)} icon={Trophy} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
          <ReportKpiCard label="Win rate" value={`${deals?.kpis?.winRate ?? 0}%`} icon={Percent} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <ReportKpiCard label="Payments received" value={fmtMoney(deals?.kpis?.paymentsReceived ?? 0)} icon={BadgeDollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
          <ReportKpiCard label="Activities" value={actKpis.total ?? 0} icon={Megaphone} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <ReportKpiCard label="Open tasks" value={tasks?.kpis?.openTotal ?? 0} icon={ListTodo} iconBg="bg-sky-50" iconColor="text-sky-600" />
          <ReportKpiCard label="Overdue tasks" value={tasks?.kpis?.overdue ?? 0} icon={CheckSquare} iconBg="bg-red-50" iconColor="text-red-600" />
        </>}
      </div>

      {/* Activity summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
        {[
          { label: 'Calls', val: actKpis.calls ?? 0, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Emails', val: actKpis.emails ?? 0, color: 'bg-blue-50 text-blue-700' },
          { label: 'Meetings', val: actKpis.meetings ?? 0, color: 'bg-purple-50 text-purple-700' },
          { label: 'Notes', val: actKpis.notes ?? 0, color: 'bg-amber-50 text-amber-700' },
          { label: 'Follow-ups', val: actKpis.followupsCreated ?? 0, color: 'bg-sky-50 text-sky-700' },
          { label: 'Follow-up rate', val: `${actKpis.followupRate ?? 0}%`, color: 'bg-rose-50 text-rose-700' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border border-surface-border px-3 py-2.5 ${c.color}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{loading ? '—' : c.val}</p>
          </div>
        ))}
      </div>

      {/* Conversion funnel */}
      <DashboardChartCard title="Lead → Deal conversion funnel" subtitle="Total leads → opportunities → deals → won">
        {loading ? <ChartSkeleton height={200} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leads?.charts?.conversionFunnel || []} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="count" name="Count" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]}>
                {(leads?.charts?.conversionFunnel || []).map((_, i) => (
                  <Cell key={i} fill={SLICES[i % SLICES.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </DashboardChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead status donut */}
        <DashboardChartCard title="Lead status distribution" subtitle="All leads by current status">
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={leads?.charts?.statusDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2}>
                  {(leads?.charts?.statusDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Leads']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Deal stage distribution */}
        <DashboardChartCard title="Deal stage distribution" subtitle="Open deals by pipeline stage">
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deals?.charts?.stageDist || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" name="Deals" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Lead source breakdown */}
        <DashboardChartCard title="Lead sources" subtitle="Where leads are coming from">
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {sourceDist.map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Leads']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Tasks open by assignee */}
        <DashboardChartCard title="Open tasks by team member" subtitle="Current workload snapshot">
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tasks?.charts?.byAssigneeOpen || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="open" name="Open" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill={CHART_COLORS.danger} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Leads trend */}
        <DashboardChartCard title="New leads — daily trend" subtitle="Leads created per day in selected period" className="lg:col-span-2">
          {loading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={leads?.charts?.trend || []}>
                <defs>
                  <linearGradient id="leadGradOv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Leads" stroke={CHART_COLORS.primary} fill="url(#leadGradOv)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      {/* Assignee workload table */}
      <DashboardChartCard title="Team task workload" subtitle="Open and overdue tasks by assignee">
        <ReportTable columns={ASSIGNEE_WORKLOAD_COLS} rows={assigneeWorkload} loading={loading} emptyText="No task assignments" maxHeightClass="max-h-[320px]" />
      </DashboardChartCard>

      {/* Overdue tasks preview */}
      {overduePreview.length > 0 ? (
        <DashboardChartCard title="Overdue tasks (top 8)" subtitle="Most urgent — switch to Tasks tab for full list">
          <ul className="divide-y divide-surface-border text-sm">
            {overduePreview.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-ink-muted">{t.assignee || 'Unassigned'} · {t.lead || 'No lead'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{t.daysOverdue ?? 0}d overdue</span>
              </li>
            ))}
          </ul>
        </DashboardChartCard>
      ) : null}
    </div>
  )
}
