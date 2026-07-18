import { Users, UserPlus, Trophy, ThumbsDown, AlertTriangle, TrendingUp, UserX, UserCheck } from '@/components/ui/icons'
import { useIsElevated } from '@/hooks/useRoleRank'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetLeadsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportStatusBadge, ReportTableSection } from '@/features/analytics/ReportLayout'

const SLICES = CHART_COLORS.slices

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—' }
function fmtVal(v) { return v ? Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—' }

const TOP_LEADS_COLS = [
  { field: 'title', headerName: 'Name', renderCell: ({ value }) => <span className="font-medium text-ink">{value || '—'}</span> },
  { field: 'company', headerName: 'Company' },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
  { field: 'source', headerName: 'Source' },
  { field: 'value', headerName: 'Value', renderCell: ({ value }) => <span className="font-semibold text-ink">{fmtVal(value)}</span> },
  { field: 'owner', headerName: 'Owner' },
  { field: 'createdAt', headerName: 'Created', renderCell: ({ value }) => fmtDate(value) },
]

const UNTOUCHED_COLS = [
  { field: 'title', headerName: 'Lead', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'company', headerName: 'Company' },
  { field: 'assignee', headerName: 'Assigned to' },
  { field: 'owner', headerName: 'Owner' },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
  { field: 'daysSinceActivity', headerName: 'Days idle', renderCell: ({ value }) => <span className="font-semibold text-amber-600">{value}</span> },
]

export function LeadsTab({ queryParams, from, to }) {
  // Team-comparative widgets hide for rank-3 users (self-scoped data).
  const isElevated = useIsElevated()

  const params = queryParams || { from, to }
  const { data, isLoading } = useGetLeadsReportQuery(params)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const top10 = d?.tables?.top10 || []
  const untouchedLeads = d?.tables?.untouchedLeads || []
  const prev = kpis.previous

  return (
    <div id="report-export-root" className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? Array.from({ length: 9 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total Leads" value={kpis.total ?? 0} icon={Users} />
          <ReportKpiCard label="New this period" value={kpis.newInPeriod ?? 0} icon={UserPlus}
            delta={prev ? `${kpis.newInPeriod >= prev.newInPeriod ? '+' : ''}${kpis.newInPeriod - prev.newInPeriod}` : null}
            deltaPositive={!prev || kpis.newInPeriod >= prev.newInPeriod} />
          <ReportKpiCard label="Assigned" value={kpis.assigned ?? 0} icon={UserCheck} />
          <ReportKpiCard label="Unassigned" value={kpis.unassigned ?? 0} icon={UserX} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Won" value={kpis.won ?? 0} icon={Trophy} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Lost" value={kpis.lost ?? 0} icon={ThumbsDown} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Junk" value={kpis.junk ?? 0} icon={AlertTriangle} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Stale (14+ days)" value={kpis.staleLeads ?? 0} sub="No recent activity" icon={AlertTriangle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Conversion rate" value={`${kpis.conversionRate ?? 0}%`} icon={TrendingUp} />
        </>}
      </div>

      {/* Conversion funnel */}
      <DashboardChartCard title="Conversion funnel" subtitle="Leads → Opportunities → Deals → Won">
        {isLoading ? <ChartSkeleton height={200} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.conversionFunnel || []} layout="vertical" margin={{ left: 20, right: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" name="Count" maxBarSize={24} radius={[0, 6, 6, 0]}>
                {(charts.conversionFunnel || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </DashboardChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Status distribution */}
        <DashboardChartCard title="Status distribution" subtitle="All leads grouped by current status">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.statusDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {(charts.statusDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Leads']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Source breakdown */}
        <DashboardChartCard title="Leads by source" subtitle="Where your leads come from">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.sourceDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {(charts.sourceDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Leads']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Stage distribution (opportunity stages) */}
        <DashboardChartCard title="Opportunity stage distribution" subtitle="Leads by pipeline stage — count and total value">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.stageDist || []} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.primary} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Lead score distribution */}
        <DashboardChartCard title="Lead score distribution" subtitle="How lead quality is spread across score buckets">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.scoreDist || []} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Leads']} />
                <Bar dataKey="count" name="Leads" maxBarSize={24} radius={[4, 4, 0, 0]}>
                  {(charts.scoreDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Daily trend */}
        <DashboardChartCard title="Leads created — daily trend" subtitle="New leads added per day" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={charts.trend || []}>
                <defs>
                  <linearGradient id="lg1Leads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Leads" stroke={CHART_COLORS.primary} fill="url(#lg1Leads)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* By owner */}
        <DashboardChartCard title="Leads by owner" subtitle="Top team members by lead count" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.byOwner || []} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* By country */}
        <DashboardChartCard title="Top countries" subtitle="Countries with most leads">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.byCountry || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.info} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      <ReportTableSection title="Untouched leads" subtitle="No activity in 14+ days — assigned to whom">
        <DataGrid
          columns={isElevated ? UNTOUCHED_COLS : UNTOUCHED_COLS.filter((c) => !['assignee', 'owner'].includes(c.field))}
          data={untouchedLeads}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[400px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="All leads have recent activity"
          emptyDescription="Every assigned lead has activity within the last 14 days."
        />
      </ReportTableSection>

      <ReportTableSection title="Top 10 leads by deal value" subtitle="Highest-value leads in your pipeline">
        <DataGrid
          columns={isElevated ? TOP_LEADS_COLS : TOP_LEADS_COLS.filter((c) => !['assignee', 'owner'].includes(c.field))}
          data={top10}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[420px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No leads with deal value found"
        />
      </ReportTableSection>
    </div>
  )
}
