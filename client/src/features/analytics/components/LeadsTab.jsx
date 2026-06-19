import { Users, UserPlus, Trophy, ThumbsDown, AlertTriangle, TrendingUp, UserX, UserCheck } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetLeadsReportQuery } from '@/features/analytics/analyticsApi'

const SLICES = CHART_COLORS.slices

function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '—' }
function fmtVal(v) { return v ? Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—' }

const TOP_LEADS_COLS = [
  { key: 'title', label: 'Name', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'source', label: 'Source' },
  { key: 'value', label: 'Value', render: (v) => <span className="font-semibold text-ink">{fmtVal(v)}</span> },
  { key: 'owner', label: 'Owner' },
  { key: 'createdAt', label: 'Created', render: (v) => fmtDate(v) },
]

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-yellow-100 text-yellow-700', proposal: 'bg-orange-100 text-orange-700',
  won: 'bg-emerald-100 text-emerald-700', lost: 'bg-red-100 text-red-700',
  junk: 'bg-gray-100 text-gray-600',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

const UNTOUCHED_COLS = [
  { key: 'title', label: 'Lead', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'company', label: 'Company' },
  { key: 'assignee', label: 'Assigned to' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'daysSinceActivity', label: 'Days idle', render: (v) => <span className="font-semibold text-amber-600">{v}</span> },
]

export function LeadsTab({ queryParams, from, to }) {
  const params = queryParams || { from, to }
  const { data, isLoading } = useGetLeadsReportQuery(params)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const top10 = d?.tables?.top10 || []
  const untouchedLeads = d?.tables?.untouchedLeads || []
  const prev = kpis.previous

  return (
    <div id="report-export-root" className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? Array.from({ length: 9 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total Leads" value={kpis.total ?? 0} icon={Users} />
          <ReportKpiCard label="New this period" value={kpis.newInPeriod ?? 0} icon={UserPlus} iconBg="bg-blue-50" iconColor="text-blue-600"
            delta={prev ? `${kpis.newInPeriod >= prev.newInPeriod ? '+' : ''}${kpis.newInPeriod - prev.newInPeriod}` : null}
            deltaPositive={!prev || kpis.newInPeriod >= prev.newInPeriod} />
          <ReportKpiCard label="Assigned" value={kpis.assigned ?? 0} icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Unassigned" value={kpis.unassigned ?? 0} icon={UserX} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Won" value={kpis.won ?? 0} icon={Trophy} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Lost" value={kpis.lost ?? 0} icon={ThumbsDown} iconBg="bg-red-50" iconColor="text-red-600" />
          <ReportKpiCard label="Junk" value={kpis.junk ?? 0} icon={AlertTriangle} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
          <ReportKpiCard label="Stale (14+ days)" value={kpis.staleLeads ?? 0} sub="No recent activity" icon={AlertTriangle} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <ReportKpiCard label="Conversion rate" value={`${kpis.conversionRate ?? 0}%`} icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </>}
      </div>

      {/* Conversion funnel */}
      <DashboardChartCard title="Conversion funnel" subtitle="Leads → Opportunities → Deals → Won">
        {isLoading ? <ChartSkeleton height={180} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={charts.conversionFunnel || []} layout="vertical" margin={{ left: 20, right: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]}>
                {(charts.conversionFunnel || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </DashboardChartCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status distribution */}
        <DashboardChartCard title="Status distribution" subtitle="All leads grouped by current status">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.statusDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2}>
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
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.sourceDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}
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
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.stageDist || []} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Lead score distribution */}
        <DashboardChartCard title="Lead score distribution" subtitle="How lead quality is spread across score buckets">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.scoreDist || []} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Leads']} />
                <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
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
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* By country */}
        <DashboardChartCard title="Top countries" subtitle="Countries with most leads">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.byCountry || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="country" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.info} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      <DashboardChartCard title="Untouched leads" subtitle="No activity in 14+ days — assigned to whom">
        <ReportTable columns={UNTOUCHED_COLS} rows={untouchedLeads} loading={isLoading} emptyText="All leads have recent activity" maxHeightClass="max-h-[400px]" />
      </DashboardChartCard>

      <DashboardChartCard title="Top 10 leads by deal value" subtitle="Highest-value leads in your pipeline">
        <ReportTable columns={TOP_LEADS_COLS} rows={top10} loading={isLoading} emptyText="No leads with deal value found" />
      </DashboardChartCard>
    </div>
  )
}
