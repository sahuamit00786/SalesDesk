import { Megaphone, Phone, Mail, Video, FileText, Bell, Percent } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetActivitiesReportQuery } from '@/features/analytics/analyticsApi'

const SLICES = CHART_COLORS.slices
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_RGB = '59,115,245' // CHART_COLORS.primary as r,g,b

function ActivityHeatmap({ heatmap }) {
  if (!heatmap?.length) return <p className="py-8 text-center text-sm text-ink-muted">No activity data</p>
  const max = Math.max(...heatmap.map((c) => c.count), 1)
  const byDow = {}
  for (const c of heatmap) {
    if (!byDow[c.dow]) byDow[c.dow] = []
    byDow[c.dow].push(c)
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-8 shrink-0" />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] font-medium text-ink-muted">{h % 6 === 0 ? `${h}h` : ''}</div>
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
          <div key={dow} className="flex items-center gap-1 mb-0.5">
            <div className="w-8 shrink-0 text-[10px] font-medium text-ink-muted text-right pr-1">{DOW_LABELS[dow - 1]}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const cell = (byDow[dow] || []).find((c) => c.hour === h)
              const count = cell?.count || 0
              const intensity = max > 0 ? count / max : 0
              return (
                <div key={h} title={`${DOW_LABELS[dow - 1]} ${h}:00 — ${count} activities`}
                  className="flex-1 h-5 rounded-sm cursor-default"
                  style={{ backgroundColor: count === 0 ? '#F1F5F9' : `rgba(${HEATMAP_RGB},${0.1 + intensity * 0.85})` }} />
              )
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-ink-muted">Less</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((i) => (
            <div key={i} className="h-3 w-5 rounded-sm" style={{ backgroundColor: `rgba(${HEATMAP_RGB},${i})` }} />
          ))}
          <span className="text-[10px] text-ink-muted">More</span>
        </div>
      </div>
    </div>
  )
}

export function ActivitiesTab({ queryParams, from, to }) {
  const params = queryParams || { from, to }
  const { data, isLoading } = useGetActivitiesReportQuery(params)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}

  return (
    <div id="report-export-root" className="space-y-4">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? Array.from({ length: 8 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total activities" value={kpis.total ?? 0} icon={Megaphone} />
          <ReportKpiCard label="Calls" value={kpis.calls ?? 0} icon={Phone} />
          <ReportKpiCard label="Emails" value={kpis.emails ?? 0} icon={Mail} />
          <ReportKpiCard label="Meetings" value={kpis.meetings ?? 0} icon={Video} />
          <ReportKpiCard label="Notes" value={kpis.notes ?? 0} icon={FileText} />
          <ReportKpiCard label="Follow-ups created" value={kpis.followupsCreated ?? 0} icon={Bell} />
          <ReportKpiCard label="Follow-ups done" value={kpis.followupsDone ?? 0} icon={Bell} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Follow-up rate" value={`${kpis.followupRate ?? 0}%`} icon={Percent} />
        </>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardChartCard title="Activities by type" subtitle="Breakdown of all logged activities">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.typeDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {(charts.typeDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Activities']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Activities by team member" subtitle="Top 10 most active members">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.byUser || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Activities" fill={CHART_COLORS.primary} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Activities over time" subtitle="Total activities logged per day" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.trend || []}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Activities" stroke={CHART_COLORS.primary} fill="url(#actGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Most active leads" subtitle="Top 10 leads by activity count">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.byLead || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Activities" fill={CHART_COLORS.info} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Follow-up completion" subtitle="Created vs completed">
          {isLoading ? <ChartSkeleton /> : (
            <div className="flex flex-col items-center justify-center py-6 gap-6">
              <div className="grid grid-cols-2 gap-6 w-full max-w-xs">
                <div className="rounded-xl border border-surface-border bg-surface-subtle p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Created</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{kpis.followupsCreated ?? 0}</p>
                </div>
                <div className="rounded-xl border border-surface-border bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Done</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">{kpis.followupsDone ?? 0}</p>
                </div>
              </div>
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-ink-muted">Completion rate</span>
                  <span className="font-semibold text-ink">{kpis.followupRate ?? 0}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, kpis.followupRate ?? 0)}%` }} />
                </div>
              </div>
            </div>
          )}
        </DashboardChartCard>
      </div>

      <DashboardChartCard title="Activity heatmap" subtitle="When does your team work? (day of week × hour of day)">
        {isLoading ? <ChartSkeleton height={180} /> : <ActivityHeatmap heatmap={charts.heatmap} />}
      </DashboardChartCard>
    </div>
  )
}
