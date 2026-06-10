import { DollarSign, TrendingUp, Trophy, Percent, BadgeDollarSign, Briefcase } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS, formatChartCurrency } from '@/features/dashboard/dummyDashboardData'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetDealsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const SLICES = CHART_COLORS.slices
const fmtMoney = (v) => formatChartCurrency(Number(v) || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const DEAL_COLS = [
  { key: 'name', label: 'Deal', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
  { key: 'stage', label: 'Stage' },
  { key: 'value', label: 'Value', render: (v, r) => <span className="font-semibold">{fmtMoney(v)} {r.currency}</span> },
  { key: 'owner', label: 'Owner' },
  { key: 'wonAt', label: 'Won date', render: (v) => fmtDate(v) },
]

const CREATED_COLS = [
  { key: 'name', label: 'Deal', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
  { key: 'stage', label: 'Stage' },
  { key: 'value', label: 'Value', render: (v, r) => <span className="font-semibold">{fmtMoney(v)} {r.currency}</span> },
  { key: 'owner', label: 'Owner' },
  { key: 'createdAt', label: 'Created', render: (v) => fmtDate(v) },
]

export function DealsTab({ queryParams }) {
  const { data, isLoading } = useGetDealsReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const tables = d?.tables || {}

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 7 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total deals" value={kpis.totalDeals ?? 0} icon={Briefcase} />
          <ReportKpiCard label="Open deals" value={kpis.openDeals ?? 0} icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="Pipeline value" value={fmtMoney(kpis.pipelineValue)} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Won value" value={fmtMoney(kpis.wonValue)} icon={Trophy} iconBg="bg-yellow-50" iconColor="text-yellow-600" />
          <ReportKpiCard label="Win rate" value={`${kpis.winRate ?? 0}%`} icon={Percent} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <ReportKpiCard label="Payments received" value={fmtMoney(kpis.paymentsReceived)} icon={BadgeDollarSign} iconBg="bg-green-50" iconColor="text-green-600" />
          <ReportKpiCard label="Payments pending" value={fmtMoney(kpis.paymentsPending)} icon={BadgeDollarSign} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Deals by stage">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.stageDist || []} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2}>
                  {(charts.stageDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Deals created — monthly trend">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Deals won in period" subtitle="Closed/won within selected date range">
        <ReportTable columns={DEAL_COLS} rows={tables.wonInPeriod || []} isLoading={isLoading} maxH="max-h-[400px]" />
      </ReportTableSection>

      <ReportTableSection title="Deals created in period" subtitle="New deals added in date range">
        <ReportTable columns={CREATED_COLS} rows={tables.createdInPeriod || []} isLoading={isLoading} maxH="max-h-[400px]" />
      </ReportTableSection>
    </div>
  )
}
