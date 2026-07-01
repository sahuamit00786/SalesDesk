import { DollarSign, TrendingUp, Trophy, Percent, BadgeDollarSign, Briefcase } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetDealsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const SLICES = CHART_COLORS.slices
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

export function DealsTab({ queryParams }) {
  const fmtMoney = useFormatChartCurrency()
  const dealCols = [
    { field: 'name', headerName: 'Deal', renderCell: ({ value }) => <span className="font-medium text-ink">{value || '—'}</span> },
    { field: 'stage', headerName: 'Stage' },
    { field: 'value', headerName: 'Value', renderCell: ({ value, row }) => <span className="font-semibold">{formatDealMoney(value, row.currency)}</span> },
    { field: 'owner', headerName: 'Owner' },
    { field: 'wonAt', headerName: 'Won date', renderCell: ({ value }) => fmtDate(value) },
  ]
  const createdCols = [
    { field: 'name', headerName: 'Deal', renderCell: ({ value }) => <span className="font-medium text-ink">{value || '—'}</span> },
    { field: 'stage', headerName: 'Stage' },
    { field: 'value', headerName: 'Value', renderCell: ({ value, row }) => <span className="font-semibold">{formatDealMoney(value, row.currency)}</span> },
    { field: 'owner', headerName: 'Owner' },
    { field: 'createdAt', headerName: 'Created', renderCell: ({ value }) => fmtDate(value) },
  ]
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
          <ReportKpiCard label="Open deals" value={kpis.openDeals ?? 0} icon={TrendingUp} />
          <ReportKpiCard label="Pipeline value" value={fmtMoney(kpis.pipelineValue)} icon={DollarSign} />
          <ReportKpiCard label="Won value" value={fmtMoney(kpis.wonValue)} icon={Trophy} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Win rate" value={`${kpis.winRate ?? 0}%`} icon={Percent} />
          <ReportKpiCard label="Payments received" value={fmtMoney(kpis.paymentsReceived)} icon={BadgeDollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Payments pending" value={fmtMoney(kpis.paymentsPending)} icon={BadgeDollarSign} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Deals by stage">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.stageDist || []} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
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
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Deals won in period" subtitle="Closed/won within selected date range">
        <DataGrid
          columns={dealCols}
          data={tables.wonInPeriod || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[400px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No deals won in this period"
        />
      </ReportTableSection>

      <ReportTableSection title="Deals created in period" subtitle="New deals added in date range">
        <DataGrid
          columns={createdCols}
          data={tables.createdInPeriod || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[400px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No deals created in this period"
        />
      </ReportTableSection>
    </div>
  )
}
