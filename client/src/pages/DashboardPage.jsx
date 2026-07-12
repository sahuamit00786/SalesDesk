import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Phone, FileText, Mail, Video, CheckSquare2, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { useGetCalendarEventsQuery } from '@/features/calendar/calendarApi'
import {
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
import { useGetCallsQuery } from '@/features/calls/callsApi'
import { useGetMeetingsQuery } from '@/features/meetings/meetingsApi'
import { useGetDashboardChartsQuery } from '@/features/analytics/analyticsApi'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { STATUS_OPTIONS } from '@/features/leads/constants'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
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

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const ACTIVITY_ICON = {
  call:    { Icon: Phone,        color: 'text-sky-500',     bg: 'bg-sky-50' },
  note:    { Icon: FileText,     color: 'text-amber-500',   bg: 'bg-amber-50' },
  email:   { Icon: Mail,         color: 'text-violet-500',  bg: 'bg-violet-50' },
  meeting: { Icon: Video,        color: 'text-emerald-500', bg: 'bg-emerald-50' },
  task:    { Icon: CheckSquare2, color: 'text-brand-500',   bg: 'bg-brand-50' },
}

const CHART_DATE_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last quarter' },
]

// Floor for "all time" ranges — predates any real record, so it behaves as an open start.
const EPOCH_DATE = '2000-01-01'

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Local yyyy-mm-dd (no UTC shift) — used for calendar day matching
function dayKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Mini month calendar with per-day meeting counts + grid lines
function MiniCalendar({ month, meetingsByDay, selectedDay, onSelectDay, onMonthChange }) {
  const year = month.getFullYear()
  const mon = month.getMonth()
  const firstWeekday = new Date(year, mon, 1).getDay()
  const daysInMonth = new Date(year, mon + 1, 0).getDate()
  const todayKey = dayKey(new Date())

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, mon, d))
  while (cells.length < 42) cells.push(null) // always 6 rows → stable height across months
  const rows = 6

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border text-ink-muted hover:bg-surface-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-ink">{monthLabel}</span>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(year, mon + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border text-ink-muted hover:bg-surface-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="pb-2 text-center text-[10px] font-semibold uppercase text-ink-faint">{w}</div>
        ))}
      </div>
      <div
        className="grid flex-1 grid-cols-7 rounded-lg border border-surface-border"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`e${idx}`} className="border-b border-r border-surface-border bg-surface-subtle/30" />
          }
          const key = dayKey(date)
          const dayMeetings = meetingsByDay[key] || []
          const count = dayMeetings.length
          const isSelected = key === selectedDay
          const isToday = key === todayKey
          const isPast = key < todayKey
          const col = idx % 7
          const rowIdx = Math.floor(idx / 7)
          const onLeft = col >= 5 // last two columns → open to the left
          const onBottom = rowIdx >= rows - 2 // last two rows → anchor to bottom
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectDay(key) } }}
              className={`group relative flex min-h-[44px] cursor-pointer flex-col items-center justify-center border-b border-r border-surface-border text-xs transition-colors ${
                isSelected
                  ? 'bg-[var(--brand-primary)] font-semibold text-white'
                  : isToday
                    ? 'bg-brand-50 font-semibold text-brand-700 hover:bg-brand-100'
                    : isPast
                      ? 'border-red-200 bg-red-50/60 text-ink-muted hover:bg-red-50'
                      : 'text-ink hover:bg-surface-muted'
              }`}
            >
              <span>{date.getDate()}</span>
              {count > 0 && (
                <span
                  className={`mt-0.5 rounded-full px-1.5 text-[9px] font-bold leading-4 ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  +{count}
                </span>
              )}
              {count > 0 && (
                <div
                  className={`absolute z-30 hidden w-56 group-hover:block ${
                    onLeft ? 'right-full pr-2' : 'left-full pl-2'
                  } ${onBottom ? 'bottom-0' : 'top-0'}`}
                >
                  <div className="rounded-xl border border-surface-border bg-white p-3 text-left shadow-xl">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="space-y-1">
                      {dayMeetings.slice(0, 5).map((evt) => (
                        <Link
                          key={evt.id}
                          to="/meetings"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-muted"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50">
                            <Video className="h-3.5 w-3.5 text-emerald-600" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink">{evt.title || 'Meeting'}</p>
                            <p className="text-[11px] text-ink-muted">
                              {new Date(evt.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {evt.leadName && <p className="truncate text-[11px] text-ink-faint">{evt.leadName}</p>}
                          </div>
                        </Link>
                      ))}
                      {count > 5 && (
                        <p className="px-1.5 text-[11px] font-medium text-ink-muted">+{count - 5} more</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


const tooltipStyle = {
  borderRadius: '12px',
  border: `1px solid #e3e7f0`,
  fontSize: '12px',
}

export function DashboardPage() {
  const formatChartCurrency = useFormatChartCurrency()
  const [chartDatePreset, setChartDatePreset] = useState('all')
  const [chartScope, setChartScope] = useState('all')
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()))

  const axisStroke = '#e3e7f0'
  const tickStyle = { fill: '#4b5263', fontSize: 11 }

  // ── Date range for chart API ──
  const { from, to } = useMemo(() => {
    const now = new Date()
    if (chartDatePreset === 'all') {
      return { from: EPOCH_DATE, to: isoDate(now) }
    }
    const days = chartDatePreset === '7d' ? 7 : chartDatePreset === '90d' ? 90 : 30
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

  // ── Recent activities (10 most recent) ──
  const { data: recentActData, isLoading: recentActLoading } = useGetActivitiesFeedQuery({ limit: 10 })
  const recentActivities = useMemo(
    () => (Array.isArray(recentActData?.data) ? recentActData.data : []),
    [recentActData],
  )

  // ── Upcoming meetings (next 48h) ──
  const authUser = useSelector((s) => s.auth.user)
  // ── Calendar month meetings (for mini calendar) ──
  const monthRange = useMemo(() => {
    const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
    const end = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [calMonth])
  const { data: monthEventsData } = useGetCalendarEventsQuery({
    from: monthRange.from,
    to: monthRange.to,
    types: 'meeting',
    ownerUserId: authUser?.id,
  })
  // Map of yyyy-mm-dd -> meetings[]
  const meetingsByDay = useMemo(() => {
    const evts = Array.isArray(monthEventsData?.data) ? monthEventsData.data : []
    const map = {}
    evts
      .filter((e) => e.source === 'meeting' || e.kind === 'meeting')
      .forEach((e) => {
        const key = dayKey(new Date(e.start))
        if (!map[key]) map[key] = []
        map[key].push(e)
      })
    Object.values(map).forEach((list) => list.sort((a, b) => new Date(a.start) - new Date(b.start)))
    return map
  }, [monthEventsData])

  // ── Existing stat card queries — all-time (from account start to now) ──
  const activityFrom = useMemo(() => new Date(EPOCH_DATE).toISOString(), [])
  const activityTo = useMemo(() => new Date().toISOString(), [])

  const { data: leadsTotalData, isLoading: leadsTotalLoading, isError: leadsTotalError } = useGetLeadsQuery({ page: 1, limit: 1 })
  const { data: oppsData, isLoading: oppsLoading, isError: oppsError } = useGetLeadsQuery({ page: 1, limit: 1, isOpportunity: true })
  const { data: tasksData, isLoading: tasksLoading, isError: tasksError } = useGetTasksQuery({})

  const activityParams = useMemo(() => ({ from: activityFrom, to: activityTo, limit: 1 }), [activityFrom, activityTo])
  const { data: emailsFeed } = useGetActivitiesFeedQuery({ ...activityParams, types: 'email' })
  // Calls/meetings live in their own tables, not the activity log — count those directly.
  const { data: callsData } = useGetCallsQuery({})
  const { data: meetingsData } = useGetMeetingsQuery({ limit: 1 })

  const totalLeads = leadsTotalData?.meta?.total
  const totalOpportunities = oppsData?.meta?.total

  const expiringTasks = useMemo(() => {
    const rows = Array.isArray(tasksData?.data) ? tasksData.data : []
    return sortExpiringTasks(rows.filter(isExpiringTask)).slice(0, DASHBOARD_EXPIRING_TASK_LIMIT)
  }, [tasksData])

  const callsTotal = Array.isArray(callsData?.data) ? callsData.data.length : 0
  const meetingsTotal = meetingsData?.meta?.total ?? 0
  const emailsTotal = emailsFeed?.meta?.total ?? 0
  const loadingTop = leadsTotalLoading || oppsLoading

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
              value={leadsTotalError ? '—' : String(totalLeads ?? 0)}
              hint="Since account start"
              compact
            />
            <StatDeltaCard label="Calls" value={String(callsTotal ?? 0)} hint="All-time activity" compact />
            <StatDeltaCard label="Meetings" value={String(meetingsTotal ?? 0)} hint="All-time activity" compact />
            <StatDeltaCard label="Emails" value={String(emailsTotal ?? 0)} hint="All-time activity" compact />
          </section>
        )}

        {/* ── Revenue Forecast + Upcoming Meetings ── */}
        <section aria-label="Revenue forecast and upcoming meetings" className="mt-6 grid gap-4 lg:grid-cols-2">

          {/* Revenue Forecast */}
          <div className="lg:col-span-1 h-full">
            <DashboardChartCard
              title="Revenue forecast"
              subtitle="Open pipeline value by stage"
              className="h-full"
            >
              {chartsLoading ? (
                <ChartSkeleton height={200} />
              ) : (
                <div>
                  <div className="mb-5 grid grid-cols-3 gap-3 border-b border-surface-border pb-5">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Pipeline</p>
                      <p className="mt-1.5 text-lg font-bold tabular-nums text-ink">{formatChartCurrency(cd?.kpis?.pipelineValue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Won</p>
                      <p className="mt-1.5 text-lg font-bold tabular-nums text-emerald-600">{formatChartCurrency(cd?.kpis?.wonValue || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">Win rate</p>
                      <p className="mt-1.5 text-lg font-bold tabular-nums text-ink">
                        {(() => {
                          const p = cd?.kpis?.pipelineValue || 0
                          const w = cd?.kpis?.wonValue || 0
                          return p + w > 0 ? `${Math.round((w / (p + w)) * 100)}%` : '—'
                        })()}
                      </p>
                    </div>
                  </div>
                  {(charts.pipelineByStage || []).length > 0 ? (() => {
                    const stageSlice = (charts.pipelineByStage || []).slice(0, 6)
                    const maxVal = Math.max(...stageSlice.map((s) => s.value), 1)
                    return (
                    <div className="space-y-3">
                      {stageSlice.map((stage) => {
                        const pct = Math.round((stage.value / maxVal) * 100)
                        return (
                          <div key={stage.name}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="font-medium text-ink">{stage.name}</span>
                              <span className="tabular-nums text-ink-muted">
                                {formatChartCurrency(stage.value)} · {stage.count} deal{stage.count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                              <div
                                className="h-full rounded-full bg-brand-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    )
                  })() : (
                    <div className="flex h-28 items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="mx-auto mb-2 h-7 w-7 text-ink-faint" />
                        <p className="text-sm text-ink-muted">No open pipeline data</p>
                        <Link to="/pipeline" className="mt-1 text-xs font-semibold text-brand-600 hover:underline">Add opportunities →</Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DashboardChartCard>
          </div>

          {/* Calendar */}
          <div className="lg:col-span-1 h-full">
            <DashboardChartCard title="Calendar" subtitle="Meetings by day" fill>
              <MiniCalendar
                month={calMonth}
                meetingsByDay={meetingsByDay}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onMonthChange={setCalMonth}
              />
            </DashboardChartCard>
          </div>
        </section>

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
                {chartsLoading ? <ChartSkeleton /> : (() => {
                  const distMap = Object.fromEntries((charts.leadStatusDist || []).map((r) => [r.name.toLowerCase(), r.value]))
                  const fullDist = STATUS_OPTIONS.map((s) => ({
                    name: s.charAt(0).toUpperCase() + s.slice(1),
                    value: distMap[s] ?? 0,
                  }))
                  const chartH = Math.max(fullDist.length * 44, 120)
                  return (
                    <ResponsiveContainer width="100%" height={chartH}>
                      <BarChart
                        layout="vertical"
                        data={fullDist}
                        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                        barSize={22}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={axisStroke} horizontal={false} />
                        <XAxis type="number" tick={tickStyle} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={90} tick={tickStyle} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="value" name="Leads" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
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

            {/* Row 2: Pipeline by status */}
            <DashboardChartCard title="Pipeline by status" subtitle="Open opportunity value ($) grouped by status">
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

          </div>
        </section>

        {/* ── Recent Activity Feed ── */}
        <section aria-label="Recent activity" className="mt-12 border-t border-surface-border pt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Recent activity</h2>
              <p className="text-sm text-ink-muted">10 most recent actions across your pipeline</p>
            </div>
            <Link to="/activities" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View all →</Link>
          </div>
          {recentActLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 rounded-xl border border-surface-border bg-white p-3">
                  <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: SK_BLOCK }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 w-3/4 rounded" style={{ backgroundColor: SK_BLOCK }} />
                    <div className="h-2 w-1/2 rounded" style={{ backgroundColor: SK_BLOCK }} />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentActivities.map((act) => {
                const cfg = ACTIVITY_ICON[act.type] || ACTIVITY_ICON.note
                const { Icon, color, bg } = cfg
                const label = act.metadata?.title || act.body || act.type
                const leadName = act.lead?.title || act.lead?.company || null
                return (
                  <div key={act.id} className="flex items-start gap-3 rounded-xl border border-surface-border bg-white px-3 py-2.5 shadow-sm">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{label}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                        {leadName && <span className="truncate">{leadName}</span>}
                        {leadName && <span className="shrink-0">·</span>}
                        <span className="shrink-0">{timeAgo(act.createdAt)}</span>
                      </div>
                      {act.user?.name && (
                        <p className="text-[11px] text-ink-faint">by {act.user.name}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-surface-border bg-white py-10 text-center">
              <p className="text-sm text-ink-muted">No recent activity found</p>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
