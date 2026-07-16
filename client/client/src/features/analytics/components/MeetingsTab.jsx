import { Video, CheckCircle, XCircle, AlertCircle, Clock, Mic, Phone, Percent } from '@/components/ui/icons'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetMeetingsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportStatusBadge, ReportTableSection } from '@/features/analytics/ReportLayout'

const SLICES = CHART_COLORS.slices
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const RECENT_COLS = [
  { field: 'title', headerName: 'Title', renderCell: ({ value }) => <span className="font-medium text-ink">{value || '—'}</span> },
  { field: 'type', headerName: 'Type' },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
  { field: 'duration', headerName: 'Duration', renderCell: ({ value }) => value ? `${value} min` : '—' },
  { field: 'owner', headerName: 'Host' },
  { field: 'date', headerName: 'Date', renderCell: ({ value }) => fmtDate(value) },
]

const SHOW_UP_COLS = [
  { field: 'name', headerName: 'Host', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'total', headerName: 'Total', renderCell: ({ value }) => <span className="font-semibold">{value}</span> },
  { field: 'completed', headerName: 'Completed', renderCell: ({ value }) => <span className="text-emerald-700 font-semibold">{value}</span> },
  { field: 'cancelled', headerName: 'Cancelled', renderCell: ({ value }) => <span className="text-amber-700">{value}</span> },
  { field: 'missed', headerName: 'Missed', renderCell: ({ value }) => <span className="text-rose-600">{value}</span> },
  { field: 'showUpRate', headerName: 'Show-up %', renderCell: ({ value }) => (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-surface-muted overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold">{value}%</span>
    </div>
  )},
]

const UPCOMING_COLS = [
  { field: 'title', headerName: 'Meeting', renderCell: ({ value }) => <span className="font-medium text-ink">{value || '—'}</span> },
  { field: 'type', headerName: 'Type' },
  { field: 'owner', headerName: 'Host' },
  { field: 'channel', headerName: 'Channel', renderCell: ({ value }) => <span className="capitalize">{String(value || '—').replace(/_/g, ' ')}</span> },
  { field: 'date', headerName: 'Scheduled', renderCell: ({ value }) => value ? new Date(value).toLocaleString() : '—' },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
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
    <div id="report-export-root" className="space-y-4">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? Array.from({ length: 10 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total meetings" value={kpis.total ?? 0} icon={Video} />
          <ReportKpiCard label="Completed" value={kpis.completed ?? 0} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Cancelled" value={kpis.cancelled ?? 0} icon={XCircle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Missed" value={kpis.missed ?? 0} icon={AlertCircle} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Avg duration" value={`${kpis.avgDuration ?? 0} min`} icon={Clock} />
          <ReportKpiCard label="With recording" value={kpis.recorded ?? 0} icon={Mic} />
          <ReportKpiCard label="With AI summary" value={kpis.withSummary ?? 0} icon={Mic} />
          <ReportKpiCard label="Show-up rate" value={`${kpis.showUpRate ?? 0}%`} icon={Percent} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
          <ReportKpiCard label="Video (Google Meet)" value={kpis.videoCount ?? 0} icon={Video} />
          <ReportKpiCard label="Phone / Offline" value={kpis.phoneCount ?? 0} icon={Phone} />
        </>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardChartCard title="Meeting status" subtitle="Completed / cancelled / missed breakdown">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.statusDist || []} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
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
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.channelDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.typeDist || []} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Meetings" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Meeting duration distribution" subtitle="How long do meetings typically last?">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.durationDist || []} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Meetings" fill={CHART_COLORS.info} maxBarSize={24} radius={[4, 4, 0, 0]}>
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

      <ReportTableSection title="Show-up rate by host" subtitle="Who has the best attendance rate for their scheduled meetings?">
        <DataGrid
          columns={SHOW_UP_COLS}
          data={charts.byOwner || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[340px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No meeting data"
        />
      </ReportTableSection>

      <ReportTableSection title="Upcoming meetings" subtitle="Scheduled ahead — filter with Past/Upcoming/All above">
        <DataGrid
          columns={UPCOMING_COLS}
          data={upcoming.length ? upcoming : recent.filter((r) => r.isUpcoming)}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[400px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No upcoming meetings"
        />
      </ReportTableSection>

      <ReportTableSection title="Recent meetings" subtitle="Meetings in selected period">
        <DataGrid
          columns={RECENT_COLS}
          data={recent}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[400px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No meetings found"
        />
      </ReportTableSection>
    </div>
  )
}
