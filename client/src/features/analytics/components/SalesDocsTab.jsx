import { FileText, Receipt, DollarSign, Percent, AlertCircle } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetSalesDocsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection, ReportStatusBadge } from '@/features/analytics/ReportLayout'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

export function SalesDocsTab({ queryParams }) {
  const fmtMoney = useFormatChartCurrency()
  const docCols = [
    { field: 'number', headerName: 'Number', renderCell: ({ value }) => <span className="font-medium">{value}</span> },
    { field: 'lead', headerName: 'Lead' },
    { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
    { field: 'value', headerName: 'Value', renderCell: ({ value, row }) => formatDealMoney(value, row.currency) },
    { field: 'owner', headerName: 'Owner' },
    { field: 'createdAt', headerName: 'Created', renderCell: ({ value }) => fmtDate(value) },
  ]
  const invCols = [
    ...docCols.slice(0, 4),
    { field: 'paid', headerName: 'Paid', renderCell: ({ value, row }) => formatDealMoney(value, row.currency) },
    ...docCols.slice(4),
  ]
  const { data, isLoading } = useGetSalesDocsReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const tables = d?.tables || {}

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Quotations (period)" value={kpis.quotationsInPeriod ?? 0} icon={FileText} />
          <ReportKpiCard label="Quote value" value={fmtMoney(kpis.quotationsValue)} icon={DollarSign} />
          <ReportKpiCard label="Invoices (period)" value={kpis.invoicesInPeriod ?? 0} icon={Receipt} />
          <ReportKpiCard label="Invoice value" value={fmtMoney(kpis.invoicesValue)} icon={DollarSign} />
          <ReportKpiCard label="Outstanding AR" value={fmtMoney(kpis.outstandingAR)} icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Quote → invoice" value={`${kpis.conversionRate ?? 0}%`} icon={Percent} />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Quotations created — daily">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.quoteTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Invoices by status">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.invoiceStatus || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Recent quotations" subtitle="Created in selected period">
        <DataGrid
          columns={docCols}
          data={tables.recentQuotations || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[360px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No quotations in this period"
        />
      </ReportTableSection>

      <ReportTableSection title="Recent invoices" subtitle="Created in selected period">
        <DataGrid
          columns={invCols}
          data={tables.recentInvoices || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[360px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No invoices in this period"
        />
      </ReportTableSection>
    </div>
  )
}
