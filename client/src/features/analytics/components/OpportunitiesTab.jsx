import { Target, DollarSign, Percent, Calendar } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetOpportunitiesReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const SLICES = CHART_COLORS.slices

export function OpportunitiesTab({ queryParams }) {
  const fmtMoney = useFormatChartCurrency()
  const stageCols = [
    { key: 'title', label: 'Opportunity', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
    { key: 'company', label: 'Company' },
    { key: 'stage', label: 'Pipeline stage' },
    { key: 'status', label: 'Status' },
    { key: 'value', label: 'Value', render: (v, r) => <span className="font-semibold">{formatDealMoney(v, r.currency)}</span> },
    { key: 'owner', label: 'Owner' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'closingDate', label: 'Expected close', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ]
  const { data, isLoading } = useGetOpportunitiesReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const byStage = d?.tables?.byStage || []

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total opportunities" value={kpis.total ?? 0} icon={Target} />
          <ReportKpiCard label="Pipeline value" value={fmtMoney(kpis.totalValue)} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Avg deal size" value={fmtMoney(kpis.avgDealSize)} icon={DollarSign} />
          <ReportKpiCard label="Win rate" value={`${kpis.winRate ?? 0}%`} icon={Percent} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <ReportKpiCard label="Closing this month" value={kpis.closingThisMonth ?? 0} icon={Calendar} iconBg="bg-amber-50" iconColor="text-amber-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Opportunities by pipeline stage" subtitle="Which stage each opportunity sits in">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.stageDist || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Value by stage">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={charts.stageDist || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2}>
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
        <ReportTable columns={stageCols} rows={byStage} isLoading={isLoading} maxH="max-h-[480px]" />
      </ReportTableSection>
    </div>
  )
}
