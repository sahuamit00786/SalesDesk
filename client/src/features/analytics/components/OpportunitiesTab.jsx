import { Target, DollarSign, Percent, Calendar } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { DataGrid } from '@/components/shared/DataGrid'
import { MixedMoneyValue } from '@/components/shared/MixedMoneyValue'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetOpportunitiesReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection, ReportStatusBadge } from '@/features/analytics/ReportLayout'

const SLICES = CHART_COLORS.slices

export function OpportunitiesTab({ queryParams }) {
  const fmtMoney = useFormatChartCurrency()
  const stageCols = [
    { field: 'title', headerName: 'Opportunity', renderCell: ({ value }) => <span className="font-medium text-ink">{value || '—'}</span> },
    { field: 'company', headerName: 'Company' },
    { field: 'stage', headerName: 'Pipeline stage' },
    { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
    { field: 'value', headerName: 'Value', renderCell: ({ value, row }) => <span className="font-semibold">{formatDealMoney(value, row.currency)}</span> },
    { field: 'owner', headerName: 'Owner' },
    { field: 'assignee', headerName: 'Assignee' },
    { field: 'closingDate', headerName: 'Expected close', renderCell: ({ value }) => value ? new Date(value).toLocaleDateString() : '—' },
  ]
  const { data, isLoading } = useGetOpportunitiesReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const byStage = d?.tables?.byStage || []
  const valueByCurrency = kpis.valueByCurrency || []

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total opportunities" value={kpis.total ?? 0} icon={Target} />
          <ReportKpiCard
            label="Pipeline value"
            value={<MixedMoneyValue rows={valueByCurrency} getAmount={(r) => r.total} getCurrency={(r) => r.currency} />}
            icon={DollarSign}
          />
          <ReportKpiCard
            label="Avg deal size"
            value={<MixedMoneyValue rows={valueByCurrency} getAmount={(r) => r.avg} getCurrency={(r) => r.currency} />}
            icon={DollarSign}
          />
          <ReportKpiCard label="Win rate" value={`${kpis.winRate ?? 0}%`} icon={Percent} />
          <ReportKpiCard label="Closing this month" value={kpis.closingThisMonth ?? 0} icon={Calendar} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Opportunities by pipeline stage" subtitle="Which stage each opportunity sits in">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.stageDist || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Count" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Value by stage">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.stageDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(charts.stageDist || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="All opportunities by stage" subtitle="Full list — filter by employee or stage above">
        <DataGrid
          columns={stageCols}
          data={byStage}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[480px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No opportunities found"
        />
      </ReportTableSection>
    </div>
  )
}
