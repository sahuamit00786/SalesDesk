import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarClock, FlaskConical } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Loader } from '@/components/shared/Loader'
import { useGetActivitiesFeedQuery } from '@/features/activities/activitiesApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import {
  CHART_COLORS,
  buildDummyDashboard,
  formatChartCurrency,
} from '@/features/dashboard/dummyDashboardData'
import { DashboardChartCard, StatDeltaCard } from '@/features/dashboard/components/DashboardChartCard'
import { cn } from '@/utils/cn'

const CHART_DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last quarter' },
]

const NEW_LEADS_DAYS = 30
const ACTIVITY_RANGE_DAYS = 30
const DASHBOARD_TASK_LIMIT = 20

function subDays(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

const PRIORITY_CLASS = {
  high: 'bg-rose-50 text-rose-800 border-rose-100',
  medium: 'bg-amber-50 text-amber-900 border-amber-100',
  low: 'bg-slate-50 text-slate-600 border-slate-100',
}

function isTaskOpen(t) {
  const s = String(t?.status || '').toLowerCase()
  return s !== 'completed' && s !== 'cancelled'
}

function isOverdue(t) {
  if (!t?.dueAt) return false
  const d = new Date(t.dueAt)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

function sortTasksByUrgency(tasks) {
  const prio = (p) => ({ high: 0, medium: 1, low: 2 }[String(p || 'low').toLowerCase()] ?? 2)
  const open = tasks.filter(isTaskOpen)
  return [...open].sort((a, b) => {
    const oa = isOverdue(a) ? 1 : 0
    const ob = isOverdue(b) ? 1 : 0
    if (oa !== ob) return ob - oa
    const pa = prio(a.priority)
    const pb = prio(b.priority)
    if (pa !== pb) return pa - pb
    const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity
    const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity
    return da - db
  })
}

function formatDue(dueAt) {
  if (!dueAt) return 'No due date'
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return 'No due date'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((day - today) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function DashboardPage() {
  const [chartDatePreset, setChartDatePreset] = useState('30d')
  const [chartScope, setChartScope] = useState('all')

  const dummyCharts = useMemo(
    () => buildDummyDashboard({ datePreset: chartDatePreset, scope: chartScope }),
    [chartDatePreset, chartScope],
  )

  const axisStroke = '#e3e7f0'
  const tickStyle = { fill: '#4b5263', fontSize: 11 }

  const activityFrom = useMemo(() => subDays(ACTIVITY_RANGE_DAYS).toISOString(), [])
  const activityTo = useMemo(() => new Date().toISOString(), [])

  const {
    data: leadsTotalData,
    isLoading: leadsTotalLoading,
    isError: leadsTotalError,
  } = useGetLeadsQuery({ page: 1, limit: 1 })

  const {
    data: leadsRecentData,
    isLoading: leadsRecentLoading,
  } = useGetLeadsQuery({
    page: 1,
    limit: 100,
    sort: 'createdAt',
    order: 'desc',
  })

  const {
    data: oppsData,
    isLoading: oppsLoading,
    isError: oppsError,
  } = useGetLeadsQuery({ page: 1, limit: 1, isOpportunity: true })

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useGetTasksQuery({})

  const activityParams = useMemo(
    () => ({
      from: activityFrom,
      to: activityTo,
      limit: 1,
    }),
    [activityFrom, activityTo],
  )

  const { data: callsFeed } = useGetActivitiesFeedQuery({ ...activityParams, types: 'call' })
  const { data: meetingsFeed } = useGetActivitiesFeedQuery({ ...activityParams, types: 'meeting' })
  const { data: emailsFeed } = useGetActivitiesFeedQuery({ ...activityParams, types: 'email' })

  const totalLeads = leadsTotalData?.meta?.total
  const totalOpportunities = oppsData?.meta?.total

  const newLeadsCount = useMemo(() => {
    const rows = Array.isArray(leadsRecentData?.data) ? leadsRecentData.data : []
    const since = subDays(NEW_LEADS_DAYS).getTime()
    let n = 0
    for (const lead of rows) {
      const c = lead?.createdAt ? new Date(lead.createdAt).getTime() : 0
      if (c >= since) n += 1
    }
    const hitCap = rows.length === 100 && n === 100
    return { n, hitCap }
  }, [leadsRecentData])

  const sortedTasks = useMemo(() => {
    const rows = Array.isArray(tasksData?.data) ? tasksData.data : []
    return sortTasksByUrgency(rows).slice(0, DASHBOARD_TASK_LIMIT)
  }, [tasksData])

  const callsTotal = callsFeed?.meta?.total ?? 0
  const meetingsTotal = meetingsFeed?.meta?.total ?? 0
  const emailsTotal = emailsFeed?.meta?.total ?? 0

  const loadingTop =
    leadsTotalLoading || leadsRecentLoading || oppsLoading

  return (
    <PageShell fullWidth>
      <div className="w-full px-1 pb-5 pt-1 sm:px-2 lg:px-3">
        {loadingTop ? (
          <div className="mt-4 flex justify-center py-12">
            <Loader label="Loading summary" />
          </div>
        ) : (
          <section aria-label="Summary totals and activity" className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatDeltaCard
              label="Total leads"
              value={leadsTotalError ? '—' : String(totalLeads ?? 0)}
              hint="All leads you can access"
              compact
            />
            <StatDeltaCard
              label="Total opportunities"
              value={oppsError ? '—' : String(totalOpportunities ?? 0)}
              hint="Open pipeline records"
              compact
            />
            <StatDeltaCard
              label="New leads"
              value={
                leadsTotalError
                  ? '—'
                  : newLeadsCount.hitCap
                    ? `${newLeadsCount.n}+`
                    : String(newLeadsCount.n)
              }
              hint={`Created in the last ${NEW_LEADS_DAYS} days`}
              delta={newLeadsCount.hitCap ? 'Top 100 by recency' : undefined}
              deltaPositive
              compact
            />
            <StatDeltaCard
              label="Calls"
              value={String(callsTotal ?? 0)}
              hint={`Activity in last ${ACTIVITY_RANGE_DAYS} days`}
              compact
            />
            <StatDeltaCard
              label="Meetings"
              value={String(meetingsTotal ?? 0)}
              hint={`Activity in last ${ACTIVITY_RANGE_DAYS} days`}
              compact
            />
            <StatDeltaCard
              label="Emails"
              value={String(emailsTotal ?? 0)}
              hint={`Activity in last ${ACTIVITY_RANGE_DAYS} days`}
              compact
            />
          </section>
        )}

        <section aria-label="Open tasks" className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Tasks</h2>
              <p className="text-sm text-ink-muted">Open tasks, most urgent first (overdue, then priority, then due date).</p>
            </div>
            <Link
              to="/tasks"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              View all tasks →
            </Link>
          </div>

          {tasksLoading ? (
            <div className="flex justify-center py-10">
              <Loader label="Loading tasks" />
            </div>
          ) : tasksError ? (
            <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load tasks.</p>
          ) : sortedTasks.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-white px-4 py-10 text-center text-sm text-ink-muted">
              No open tasks.{' '}
              <Link to="/tasks" className="font-semibold text-brand-600 hover:underline">
                Create one on the Tasks page
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white shadow-sm">
              {sortedTasks.map((task) => {
                const p = String(task.priority || 'low').toLowerCase()
                const chip = PRIORITY_CLASS[p] || PRIORITY_CLASS.low
                const overdue = isOverdue(task)
                return (
                  <li key={task.id}>
                    <Link
                      to={task.leadId ? `/leads/${task.leadId}` : '/tasks'}
                      className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              chip,
                            )}
                          >
                            {p}
                          </span>
                          {overdue ? (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                              Overdue
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 font-medium text-ink">{task.title || 'Untitled task'}</p>
                        {task.lead ? (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            Lead: {task.lead.title || task.lead.contactName || task.lead.email || '—'}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-ink-muted sm:flex-col sm:items-end sm:text-right">
                        <CalendarClock className="h-4 w-4 sm:hidden" aria-hidden />
                        <span className={overdue ? 'text-rose-700' : ''}>{formatDue(task.dueAt)}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-label="Trend charts" className="mt-12 w-full border-t border-surface-border pt-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Trends & breakdowns</h2>
              <p className="mt-1 text-sm text-ink-muted">Illustrative charts — swap for live analytics when ready.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
              <span className="font-semibold">Sample chart data</span>
            </div>
          </div>

          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <span className="mr-1 self-center text-xs font-medium text-ink-muted">Chart range</span>
              {CHART_DATE_PRESETS.map((p) => {
                const active = chartDatePreset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setChartDatePreset(p.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'border border-surface-border bg-white text-ink-muted hover:bg-surface-muted'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="dash-chart-scope" className="text-xs font-medium text-ink-muted">
                Chart scope
              </label>
              <select
                id="dash-chart-scope"
                value={chartScope}
                onChange={(e) => setChartScope(e.target.value)}
                className="h-9 rounded-lg border border-surface-border bg-white px-3 text-xs font-medium text-ink outline-none focus:border-brand-400"
              >
                <option value="all">All owners</option>
                <option value="mine">My pipeline</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardChartCard title="Lead funnel" subtitle="Lifecycle stages (sell)">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={dummyCharts.leadFunnel}
                    margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} horizontal={false} />
                    <XAxis type="number" tick={tickStyle} />
                    <YAxis type="category" dataKey="stage" width={100} tick={tickStyle} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: `1px solid ${axisStroke}`,
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Leads" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChartCard>

              <DashboardChartCard title="Pipeline by stage" subtitle="Open value ($)">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dummyCharts.pipelineByStage} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                    <XAxis dataKey="stage" tick={tickStyle} />
                    <YAxis tickFormatter={(v) => formatChartCurrency(v)} width={56} tick={tickStyle} />
                    <Tooltip
                      formatter={(value) => formatChartCurrency(value)}
                      contentStyle={{
                        borderRadius: '12px',
                        border: `1px solid ${axisStroke}`,
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name="Value" fill={CHART_COLORS.primaryDark} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChartCard>
            </div>

            <DashboardChartCard title="Pipeline created vs closed won" subtitle="Monthly trend ($)">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dummyCharts.pipelineTrend} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                  <XAxis dataKey="month" tick={tickStyle} />
                  <YAxis tickFormatter={(v) => formatChartCurrency(v)} width={56} tick={tickStyle} />
                  <Tooltip
                    formatter={(value) => formatChartCurrency(value)}
                    contentStyle={{
                      borderRadius: '12px',
                      border: `1px solid ${axisStroke}`,
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="created"
                    name="Pipeline created"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.18}
                  />
                  <Area
                    type="monotone"
                    dataKey="closed"
                    name="Closed won"
                    stroke={CHART_COLORS.success}
                    fill={CHART_COLORS.success}
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </DashboardChartCard>

            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardChartCard title="Activities by type" subtitle="Engage — mix this period">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dummyCharts.activitiesByType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {dummyCharts.activitiesByType.map((entry, i) => (
                        <Cell key={entry.name} fill={CHART_COLORS.slices[i % CHART_COLORS.slices.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: `1px solid ${axisStroke}`,
                        fontSize: '12px',
                      }}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </DashboardChartCard>

              <DashboardChartCard title="Tasks throughput" subtitle="Created vs completed by week">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dummyCharts.tasksThroughput} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                    <XAxis dataKey="week" tick={tickStyle} />
                    <YAxis tick={tickStyle} width={36} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: `1px solid ${axisStroke}`,
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke={CHART_COLORS.success}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="created"
                      name="Created"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </DashboardChartCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardChartCard title="Lead sources" subtitle="Attributed volume">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dummyCharts.leadSources}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {dummyCharts.leadSources.map((entry, i) => (
                        <Cell key={entry.name} fill={CHART_COLORS.slices[i % CHART_COLORS.slices.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: `1px solid ${axisStroke}`,
                        fontSize: '12px',
                      }}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </DashboardChartCard>

              <DashboardChartCard title="Campaigns & forms" subtitle="Sends vs submissions">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dummyCharts.campaignForms} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                    <XAxis dataKey="name" tick={{ ...tickStyle, fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={64} />
                    <YAxis tick={tickStyle} width={40} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: `1px solid ${axisStroke}`,
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="sends" name="Sends" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="submissions" name="Submissions" fill={CHART_COLORS.primaryDark} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChartCard>
            </div>

            <DashboardChartCard title="Forecast vs actual revenue" subtitle="Insights / forecasting preview ($)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dummyCharts.forecastVsActual} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                  <XAxis dataKey="month" tick={tickStyle} />
                  <YAxis tickFormatter={(v) => formatChartCurrency(v)} width={56} tick={tickStyle} />
                  <Tooltip
                    formatter={(value) => formatChartCurrency(value)}
                    contentStyle={{
                      borderRadius: '12px',
                      border: `1px solid ${axisStroke}`,
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="forecast" name="Forecast" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </DashboardChartCard>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
