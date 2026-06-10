import { Video, CheckCircle, XCircle, AlertCircle, Clock, Mic, Phone, Percent } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetMeetingsReportQuery } from '@/features/analytics/analyticsApi'

const SLICES = CHART_COLORS.slices
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const RECENT_COLS = [
  { key: 'title', label: 'Title', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'duration', label: 'Duration', render: (v) => v ? `${v} min` : '—' },
  { key: 'owner', label: 'Host' },
  { key: 'date', label: 'Date', render: (v) => fmtDate(v) },
]

const STATUS_COLORS = {
  completed: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-red-100 text-red-700',
  cancelled: 'bg-amber-100 text-amber-700',
  missed: 'bg-gray-100 text-gray-600',
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

const SHOW_UP_COLS = [
  { key: 'name', label: 'Host', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'total', label: 'Total', render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'completed', label: 'Completed', render: (v) => <span className="text-emerald-700 font-semibold">{v}</span> },
  { key: 'cancelled', label: 'Cancelled', render: (v) => <span className="text-amber-700">{v}</span> },
  { key: 'missed', label: 'Missed', render: (v) => <span className="text-rose-600">{v}</span> },
  { key: 'showUpRate', label: 'Show-up %', render: (v) => (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs font-semibold">{v}%</span>
    </div>
  )},
]

const UPCOMING_COLS = [
  { key: 'title', label: 'Meeting', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
  { key: 'type', label: 'Type' },
  { key: 'owner', label: 'Host' },
  { key: 'channel', label: 'Channel', render: (v) => <span className="capitalize">{String(v || '—').replace(/_/g, ' ')}</span> },
  { key: 'date', label: 'Scheduled', render: (v) => v ? new Date(v).toLocaleString() : '—' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
]

export function MeetingsTab({ queryParams, from, to }) {
  const params = queryParams || { from, to }
  const { data, isLoading } = useGetMeetingsReportQuery(params)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const recent = d?.tables?.recent || []
  const upcoming = d?.tables?.upcoming || []

  return (
    <div id="report-export-root" className="space-y-6">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? Array.from({ length: 10 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total meetings" value={kpis.total ?? 0} icon={Video} />
          <ReportKpiCard label="Completed" value={kpis.completed ?? 0} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Cancelled" value={kpis.cancelled ?? 0} icon={XCircle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Missed" value={kpis.missed ?? 0} icon={AlertCircle} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Avg duration" value={`${kpis.avgDuration ?? 0} min`} icon={Clock} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="With recording" value={kpis.recorded ?? 0} icon={Mic} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <ReportKpiCard label="With AI summary" value={kpis.withSummary ?? 0} icon={Mic} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          <ReportKpiCard label="Show-up rate" value={`${kpis.showUpRate ?? 0}%`} icon={Percent} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
          <ReportKpiCard label="Video (Google Meet)" value={kpis.videoCount ?? 0} icon={Video} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="Phone / Offline" value={kpis.phoneCount ?? 0} icon={Phone} iconBg="bg-slate-50" iconColor="text-slate-600" />
        </>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardChartCard title="Meeting status" subtitle="Completed / cancelled / missed breakdown">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.statusDist || []} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2}>
                  {(charts.statusDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Meetings']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Video vs phone" subtitle="Channel breakdown">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.channelDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {(charts.channelDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Meetings']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Meeting type distribution" subtitle="Demo / follow-up / closing / internal">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.typeDist || []} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Meetings" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Meeting duration distribution" subtitle="How long do meetings typically last?">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.durationDist || []} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Meetings" fill={CHART_COLORS.info} radius={[4, 4, 0, 0]}>
                  {(charts.durationDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Meetings over time" subtitle="Total meetings per day" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.trend || []}>
                <defs>
                  <linearGradient id="meetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Meetings" stroke={CHART_COLORS.primary} fill="url(#meetGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      <DashboardChartCard title="Show-up rate by host" subtitle="Who has the best attendance rate for their scheduled meetings?">
        <ReportTable columns={SHOW_UP_COLS} rows={charts.byOwner || []} loading={isLoading} emptyText="No meeting data" />
      </DashboardChartCard>

      <DashboardChartCard title="Upcoming meetings" subtitle="Scheduled ahead — filter with Past/Upcoming/All above">
        <ReportTable columns={UPCOMING_COLS} rows={upcoming.length ? upcoming : recent.filter((r) => r.isUpcoming)} loading={isLoading} emptyText="No upcoming meetings" maxHeightClass="max-h-[400px]" />
      </DashboardChartCard>

      <DashboardChartCard title="Recent meetings" subtitle="Meetings in selected period">
        <ReportTable columns={RECENT_COLS} rows={recent} loading={isLoading} emptyText="No meetings found" maxHeightClass="max-h-[400px]" />
      </DashboardChartCard>
    </div>
  )
}
