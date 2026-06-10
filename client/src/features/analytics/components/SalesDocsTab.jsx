import { FileText, Receipt, DollarSign, Percent, AlertCircle } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { formatChartCurrency } from '@/features/dashboard/dummyDashboardData'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetSalesDocsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const fmtMoney = (v) => formatChartCurrency(Number(v) || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const DOC_COLS = [
  { key: 'number', label: 'Number', render: (v) => <span className="font-medium">{v}</span> },
  { key: 'lead', label: 'Lead' },
  { key: 'status', label: 'Status' },
  { key: 'value', label: 'Value', render: (v, r) => fmtMoney(v) + (r.currency ? ` ${r.currency}` : '') },
  { key: 'owner', label: 'Owner' },
  { key: 'createdAt', label: 'Created', render: (v) => fmtDate(v) },
]

const INV_COLS = [
  ...DOC_COLS.slice(0, 4),
  { key: 'paid', label: 'Paid', render: (v) => fmtMoney(v) },
  ...DOC_COLS.slice(4),
]

export function SalesDocsTab({ queryParams }) {
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
          <ReportKpiCard label="Quote value" value={fmtMoney(kpis.quotationsValue)} icon={DollarSign} iconBg="bg-sky-50" iconColor="text-sky-600" />
          <ReportKpiCard label="Invoices (period)" value={kpis.invoicesInPeriod ?? 0} icon={Receipt} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Invoice value" value={fmtMoney(kpis.invoicesValue)} icon={DollarSign} />
          <ReportKpiCard label="Outstanding AR" value={fmtMoney(kpis.outstandingAR)} icon={AlertCircle} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Quote → invoice" value={`${kpis.conversionRate ?? 0}%`} icon={Percent} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Quotations created — daily">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={charts.quoteTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Invoices by status">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.invoiceStatus || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Recent quotations" subtitle="Created in selected period">
        <ReportTable columns={DOC_COLS} rows={tables.recentQuotations || []} isLoading={isLoading} maxH="max-h-[360px]" />
      </ReportTableSection>

      <ReportTableSection title="Recent invoices" subtitle="Created in selected period">
        <ReportTable columns={INV_COLS} rows={tables.recentInvoices || []} isLoading={isLoading} maxH="max-h-[360px]" />
      </ReportTableSection>
    </div>
  )
}
