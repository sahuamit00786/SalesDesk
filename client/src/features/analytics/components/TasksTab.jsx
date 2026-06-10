import { CheckSquare, AlertTriangle, Percent, UserX, CalendarClock, ListTodo } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetTasksReportQuery } from '@/features/analytics/analyticsApi'
import { ASSIGNEE_WORKLOAD_COLS, TASK_DETAIL_COLS } from '@/features/analytics/reportColumns'

const SLICES = CHART_COLORS.slices

const OVERDUE_COLS = [
  ...TASK_DETAIL_COLS,
  { key: 'daysOverdue', label: 'Days overdue', render: (v) => <span className="font-semibold text-rose-600">{v ?? 0}</span> },
]

export function TasksTab({ queryParams, from, to }) {
  const params = queryParams || { from, to }
  const { data, isLoading } = useGetTasksReportQuery(params)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const tables = d?.tables || {}

  return (
    <div id="report-export-root" className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <p className="flex-1 rounded-xl border border-surface-border bg-surface-subtle/60 px-4 py-2 text-sm text-ink-muted">
          Open/overdue counts = <span className="font-semibold text-ink">current state</span>. Created/completed = selected period.
        </p>
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm">
          <span className="text-ink-muted">Workspace pending: </span>
          <span className="font-bold text-brand-700">{kpis.workspacePendingTotal ?? (kpis.pending ?? 0) + (kpis.inProgress ?? 0)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Created (period)" value={kpis.total ?? 0} icon={CheckSquare} />
          <ReportKpiCard label="Open now" value={kpis.openTotal ?? 0} icon={ListTodo} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="Completed" value={kpis.completed ?? 0} icon={CheckSquare} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Overdue" value={kpis.overdue ?? 0} icon={AlertTriangle} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Due today" value={kpis.dueToday ?? 0} icon={CalendarClock} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Unassigned open" value={kpis.unassignedOpen ?? 0} icon={UserX} iconBg="bg-slate-50" iconColor="text-slate-600" />
          <ReportKpiCard label="Completion rate" value={`${kpis.completionRate ?? 0}%`} icon={Percent} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardChartCard title="Task status breakdown" subtitle="Open / in-progress / completed / overdue distribution">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.statusDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2}>
                  {(charts.statusDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Tasks']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Tasks by priority" subtitle="High / medium / low / none — completed vs pending">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.priorityDist || []} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {(charts.priorityDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Created vs completed — daily trend" subtitle="Are you completing as many as you create?" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" name="Created" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.success} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Tasks by assignee" subtitle="Who has the most tasks in the period?">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.byAssignee || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Tasks" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Overdue by assignee" subtitle="Who has the most overdue tasks right now?">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.byAssigneeOpen || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="open" name="Open" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill={CHART_COLORS.danger} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      <DashboardChartCard title="Team workload" subtitle="Full breakdown per assignee — open, overdue, period activity">
        <ReportTable columns={ASSIGNEE_WORKLOAD_COLS} rows={tables.assigneeWorkload || []} loading={isLoading} emptyText="No task assignments" maxHeightClass="max-h-[320px]" />
      </DashboardChartCard>

      <DashboardChartCard title="Overdue tasks" subtitle="All tasks past their due date">
        <ReportTable columns={OVERDUE_COLS} rows={tables.overdue || []} loading={isLoading} emptyText="No overdue tasks — great!" maxHeightClass="max-h-[400px]" />
      </DashboardChartCard>

      <DashboardChartCard title="All open tasks" subtitle="Current open task list">
        <ReportTable columns={TASK_DETAIL_COLS} rows={tables.openTasks || []} loading={isLoading} emptyText="No open tasks" maxHeightClass="max-h-[400px]" />
      </DashboardChartCard>
    </div>
  )
}
