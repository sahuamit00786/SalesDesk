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
import { PageShell } from '@/components/layout/PageShell'
import { useGetActivitiesFeedQuery } from '@/features/activities/activitiesApi'
import { useGetLeadsQuery } from '@/features/leads/leadsApi'
import { useGetTasksQuery } from '@/features/tasks/tasksApi'
import { useGetDashboardChartsQuery } from '@/features/analytics/analyticsApi'
import { CHART_COLORS, formatChartCurrency } from '@/features/dashboard/dummyDashboardData'
import { DashboardChartCard, StatDeltaCard } from '@/features/dashboard/components/DashboardChartCard'
import {
  DASHBOARD_EXPIRING_TASK_LIMIT,
  DashboardExpiringTasks,
  EXPIRING_HORIZON_DAYS,
  isExpiringTask,
  sortExpiringTasks,
} from '@/features/dashboard/components/DashboardExpiringTasks'

const SK_BASE = '#F9F7FC'
const SK_BLOCK = '#DDD5F0'
const SK_BORDER = '#C9BDE8'

function StatCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl px-4 py-4"
      style={{ backgroundColor: SK_BASE, border: `1.5px solid ${SK_BORDER}` }}
    >
      <div className="h-2.5 w-20 rounded-md" style={{ backgroundColor: SK_BLOCK }} />
      <div className="mt-3 h-8 w-16 rounded-lg" style={{ backgroundColor: SK_BLOCK }} />
      <div className="mt-2.5 h-2 w-28 rounded" style={{ backgroundColor: SK_BLOCK }} />
      <div className="mt-3 h-px w-full" style={{ backgroundColor: SK_BORDER }} />
      <div className="mt-3 h-2 w-24 rounded" style={{ backgroundColor: SK_BLOCK }} />
    </div>
  )
}

function ChartSkeleton({ height = 260 }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="h-24 w-24 animate-pulse rounded-full bg-surface-subtle" />
    </div>
  )
}

const CHART_DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last quarter' },
]

const NEW_LEADS_DAYS = 30
const ACTIVITY_RANGE_DAYS = 30

function subDays(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Avatar initial with brand colour ring
function MemberAvatar({ name, rank }) {
  const colors = ['bg-brand-600', 'bg-emerald-600', 'bg-purple-600', 'bg-orange-500']
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${colors[rank % colors.length]}`}>
      {String(name || '?')[0].toUpperCase()}
    </span>
  )
}

const tooltipStyle = {
  borderRadius: '12px',
  border: `1px solid #e3e7f0`,
  fontSize: '12px',
}

export function DashboardPage() {
  const [chartDatePreset, setChartDatePreset] = useState('30d')
  const [chartScope, setChartScope] = useState('all')

  const axisStroke = '#e3e7f0'
  const tickStyle = { fill: '#4b5263', fontSize: 11 }

  // ── Date range for chart API ──
  const { from, to } = useMemo(() => {
    const days = chartDatePreset === '7d' ? 7 : chartDatePreset === '90d' ? 90 : 30
    const now = new Date()
    return {
      from: isoDate(new Date(now.getTime() - days * 86400000)),
      to: isoDate(now),
    }
  }, [chartDatePreset])

  // ── Charts API ──
  const { data: chartsData, isLoading: chartsLoading } = useGetDashboardChartsQuery(
    { from, to, scope: chartScope },
  )
  const cd = chartsData?.data
  const charts = cd?.charts || {}
  const topMembers = cd?.topMembers || []

  // ── Existing stat card queries (unchanged) ──
  const activityFrom = useMemo(() => subDays(ACTIVITY_RANGE_DAYS).toISOString(), [])
  const activityTo = useMemo(() => new Date().toISOString(), [])

  const { data: leadsTotalData, isLoading: leadsTotalLoading, isError: leadsTotalError } = useGetLeadsQuery({ page: 1, limit: 1 })
  const { data: leadsRecentData, isLoading: leadsRecentLoading } = useGetLeadsQuery({ page: 1, limit: 100, sort: 'createdAt', order: 'desc' })
  const { data: oppsData, isLoading: oppsLoading, isError: oppsError } = useGetLeadsQuery({ page: 1, limit: 1, isOpportunity: true })
  const { data: tasksData, isLoading: tasksLoading, isError: tasksError } = useGetTasksQuery({})

  const activityParams = useMemo(() => ({ from: activityFrom, to: activityTo, limit: 1 }), [activityFrom, activityTo])
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

  const expiringTasks = useMemo(() => {
    const rows = Array.isArray(tasksData?.data) ? tasksData.data : []
    return sortExpiringTasks(rows.filter(isExpiringTask)).slice(0, DASHBOARD_EXPIRING_TASK_LIMIT)
  }, [tasksData])

  const callsTotal = callsFeed?.meta?.total ?? 0
  const meetingsTotal = meetingsFeed?.meta?.total ?? 0
  const emailsTotal = emailsFeed?.meta?.total ?? 0
  const loadingTop = leadsTotalLoading || leadsRecentLoading || oppsLoading

  return (
    <PageShell fullWidth>
      <div className="min-h-full w-full bg-surface-muted px-1 pb-5 pt-1 sm:px-2 lg:px-3">

        {/* ── Stat cards ── */}
        {loadingTop ? (
          <section className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => <StatCardSkeleton key={i} />)}
          </section>
        ) : (
          <section aria-label="Summary totals and activity" className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatDeltaCard label="Total leads" value={leadsTotalError ? '—' : String(totalLeads ?? 0)} hint="All leads you can access" compact />
            <StatDeltaCard label="Total opportunities" value={oppsError ? '—' : String(totalOpportunities ?? 0)} hint="Open pipeline records" compact />
            <StatDeltaCard
              label="New leads"
              value={leadsTotalError ? '—' : newLeadsCount.hitCap ? `${newLeadsCount.n}+` : String(newLeadsCount.n)}
              hint={`Created in the last ${NEW_LEADS_DAYS} days`}
              delta={newLeadsCount.hitCap ? 'Top 100 by recency' : undefined}
              deltaPositive compact
            />
            <StatDeltaCard label="Calls" value={String(callsTotal ?? 0)} hint={`Activity in last ${ACTIVITY_RANGE_DAYS} days`} compact />
            <StatDeltaCard label="Meetings" value={String(meetingsTotal ?? 0)} hint={`Activity in last ${ACTIVITY_RANGE_DAYS} days`} compact />
            <StatDeltaCard label="Emails" value={String(emailsTotal ?? 0)} hint={`Activity in last ${ACTIVITY_RANGE_DAYS} days`} compact />
          </section>
        )}

        {/* ── Expiring tasks ── */}
        <section aria-label="Tasks expiring soon" className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Tasks expiring soon</h2>
              <p className="text-sm text-ink-muted">
                Up to {DASHBOARD_EXPIRING_TASK_LIMIT} open tasks overdue or due within {EXPIRING_HORIZON_DAYS} days.
              </p>
            </div>
            <Link to="/tasks" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View all tasks →</Link>
          </div>
          <DashboardExpiringTasks tasks={expiringTasks} loading={tasksLoading} error={tasksError} />
        </section>

        {/* ── Trends & breakdowns ── */}
        <section aria-label="Trend charts" className="mt-12 w-full border-t border-surface-border pt-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Trends & breakdowns</h2>
              <p className="mt-1 text-sm text-ink-muted">Live data from your CRM.</p>
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
                        ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                        : 'border border-surface-border bg-white text-ink-muted hover:bg-surface-muted'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="dash-chart-scope" className="text-xs font-medium text-ink-muted">Chart scope</label>
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

            {/* Row 1: Lead status + Opportunity status */}
            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardChartCard title="Lead status breakdown" subtitle="All leads by current status">
                {chartsLoading ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      layout="vertical"
                      data={charts.leadStatusDist || []}
                      margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} horizontal={false} />
                      <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={90} tick={tickStyle} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Leads" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </DashboardChartCard>

              <DashboardChartCard title="Opportunity status breakdown" subtitle="Opportunities by configurable status">
                {chartsLoading ? <ChartSkeleton /> : (
                  charts.oppStatusDist?.length ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={charts.oppStatusDist}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {charts.oppStatusDist.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS.slices[i % CHART_COLORS.slices.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
                      <p className="text-sm text-ink-muted">No opportunity statuses configured</p>
                      <Link to="/lead-configuration" className="text-xs font-semibold text-brand-600 hover:underline">Configure statuses →</Link>
                    </div>
                  )
                )}
              </DashboardChartCard>
            </div>

            {/* Row 2: Pipeline by stage */}
            <DashboardChartCard title="Pipeline by stage" subtitle="Open opportunity value ($) grouped by stage">
              {chartsLoading ? <ChartSkeleton height={280} /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={charts.pipelineByStage || []}
                    margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                    <XAxis dataKey="name" tick={tickStyle} />
                    <YAxis tickFormatter={formatChartCurrency} width={56} tick={tickStyle} />
                    <Tooltip
                      formatter={(value, name) => name === 'value' ? [formatChartCurrency(value), 'Value'] : [value, 'Count']}
                      contentStyle={tooltipStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="value" name="Value ($)" fill={CHART_COLORS.primaryDark} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="count" name="Count" fill={CHART_COLORS.secondary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </DashboardChartCard>

            {/* Row 3: Pipeline created vs closed won */}
            <DashboardChartCard title="Pipeline created vs closed won" subtitle="Monthly count of new opportunities vs won deals">
              {chartsLoading ? <ChartSkeleton height={280} /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart
                    data={charts.pipelineTrend || []}
                    margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                    <XAxis dataKey="month" tick={tickStyle} />
                    <YAxis tick={tickStyle} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="created"
                      name="Pipeline created"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="won"
                      name="Closed won"
                      stroke={CHART_COLORS.success}
                      fill={CHART_COLORS.success}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </DashboardChartCard>

            {/* Row 4: Activities by type + Tasks throughput */}
            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardChartCard title="Activities by type" subtitle="Engagement mix this period">
                {chartsLoading ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={charts.activitiesByType || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {(charts.activitiesByType || []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS.slices[i % CHART_COLORS.slices.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </DashboardChartCard>

              <DashboardChartCard title="Tasks throughput" subtitle="Created vs completed per day">
                {chartsLoading ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={charts.tasksThroughput || []}
                      margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} />
                      <XAxis dataKey="date" tick={tickStyle} tickFormatter={(d) => d?.slice(5)} />
                      <YAxis tick={tickStyle} width={36} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="created" name="Created" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </DashboardChartCard>
            </div>

            {/* Row 5: Top 4 Performers */}
            <DashboardChartCard title="Top performers" subtitle="Best 4 team members scored by leads × 3 + tasks done × 2 + activities">
              {chartsLoading ? <ChartSkeleton /> : (
                topMembers.length ? (
                  <div className="grid grid-cols-2 gap-3 pt-1 md:grid-cols-4">
                    {topMembers.map((m, i) => (
                      <div key={m.name} className="rounded-xl border border-surface-border bg-surface-subtle/40 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <MemberAvatar name={m.name} rank={i} />
                          <span className="truncate text-sm font-semibold text-ink">{m.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">Leads</p>
                            <p className="mt-0.5 text-base font-bold text-ink">{m.leadsOwned}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">Tasks</p>
                            <p className="mt-0.5 text-base font-bold text-ink">{m.tasksCompleted}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">Activity</p>
                            <p className="mt-0.5 text-base font-bold text-ink">{m.activities}</p>
                          </div>
                        </div>
                        {i === 0 && (
                          <div className="mt-2 flex justify-center">
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">🏆 Top performer</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center">
                    <p className="text-sm text-ink-muted">No team members found in this workspace.</p>
                  </div>
                )
              )}
            </DashboardChartCard>

          </div>
        </section>
      </div>
    </PageShell>
  )
}
