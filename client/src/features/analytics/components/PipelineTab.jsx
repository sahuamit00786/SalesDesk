import { DollarSign, TrendingUp, Trophy, Percent, BadgeDollarSign, Briefcase } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetDealsReportQuery } from '@/features/analytics/analyticsApi'

const SLICES = CHART_COLORS.slices
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

export function PipelineTab({ from, to }) {
  const fmtMoney = useFormatChartCurrency()
  const recentCols = [
    { key: 'name', label: 'Deal', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
    { key: 'stage', label: 'Stage' },
    { key: 'value', label: 'Value', render: (v, r) => <span className="font-semibold text-ink">{formatDealMoney(v, r.currency)}</span> },
    { key: 'owner', label: 'Owner' },
    { key: 'createdAt', label: 'Created', render: (v) => fmtDate(v) },
    { key: 'updatedAt', label: 'Updated', render: (v) => fmtDate(v) },
  ]
  const ownerCols = [
    { key: 'name', label: 'Owner', render: (v) => <span className="font-medium text-ink">{v}</span> },
    { key: 'email', label: 'Email', render: (v) => <span className="text-xs text-ink-muted">{v}</span> },
    { key: 'deals', label: 'Deals', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'value', label: 'Pipeline value', render: (v) => <span className="font-semibold text-emerald-700">{fmtMoney(v)}</span> },
  ]
  const { data, isLoading } = useGetDealsReportQuery({ from, to })
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const tables = d?.tables || {}

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? Array.from({ length: 7 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total deals" value={kpis.totalDeals ?? 0} icon={Briefcase} />
          <ReportKpiCard label="Open deals" value={kpis.openDeals ?? 0} icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="Pipeline value" value={fmtMoney(kpis.pipelineValue)} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Won value" value={fmtMoney(kpis.wonValue)} icon={Trophy} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
          <ReportKpiCard label="Win rate" value={`${kpis.winRate ?? 0}%`} icon={Percent} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <ReportKpiCard label="Payments received" value={fmtMoney(kpis.paymentsReceived)} icon={BadgeDollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-700" />
          <ReportKpiCard label="Payments pending" value={fmtMoney(kpis.paymentsPending)} icon={BadgeDollarSign} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stage distribution */}
        <DashboardChartCard title="Deals by stage" subtitle="Count and total value per deal stage">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.stageDist || []} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v, name) => name === 'value' ? [fmtMoney(v), 'Value'] : [v, 'Count']} />
                <Bar dataKey="count" name="Deals" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Deal value distribution */}
        <DashboardChartCard title="Deal value distribution" subtitle="How deals are spread across value ranges">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.valueDist || []} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                  {(charts.valueDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Monthly deal trend */}
        <DashboardChartCard title="Monthly deal trend" subtitle="Deals created per month with total value" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={fmtMoney} />
                <Tooltip formatter={(v, name) => name === 'createdValue' ? [fmtMoney(v), 'Value'] : [v, 'Deals']} />
                <Legend />
                <Bar yAxisId="left" dataKey="created" name="Deals" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="createdValue" name="Value" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Payments by mode */}
        <DashboardChartCard title="Payments by mode" subtitle="Which payment methods are most used (received only)">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.paymentsByMode || []} dataKey="value" nameKey="mode" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}
                  label={({ mode, percent }) => `${mode} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {(charts.paymentsByMode || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [fmtMoney(v), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Payment status donut */}
        <DashboardChartCard title="Payment status breakdown" subtitle="Received / pending / failed / refunded">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={(charts.paymentsByStatus || []).map((r) => ({ ...r, name: r.status }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {(charts.paymentsByStatus || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [fmtMoney(v), name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Payments trend */}
        <DashboardChartCard title="Payments received vs pending — monthly" subtitle="Cash flow trend by month" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.paymentsTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtMoney} />
                <Tooltip formatter={(v) => [fmtMoney(v)]} />
                <Legend />
                <Bar dataKey="received" name="Received" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill={CHART_COLORS.warning || '#FBBF24'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Deals by owner */}
        <DashboardChartCard title="Deals by owner" subtitle="Pipeline value per team member" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.dealsByOwner || []} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={fmtMoney} />
                <Tooltip formatter={(v, name) => name === 'value' ? [fmtMoney(v), 'Pipeline'] : [v, 'Deals']} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Deals" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="value" name="Pipeline" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      {/* Owner performance table */}
      <DashboardChartCard title="Deals by owner — detail" subtitle="Pipeline ownership breakdown">
        <ReportTable columns={ownerCols} rows={tables.dealsByOwner || []} loading={isLoading} emptyText="No deals found" />
      </DashboardChartCard>

      {/* Recent deals */}
      <DashboardChartCard title="Recent deals (last 20)" subtitle="Most recently updated deals">
        <ReportTable columns={recentCols} rows={tables.recentDeals || []} loading={isLoading} emptyText="No deals found" />
      </DashboardChartCard>
    </div>
  )
}
