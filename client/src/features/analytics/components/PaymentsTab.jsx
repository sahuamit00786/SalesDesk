import { CreditCard, DollarSign, Briefcase, Receipt } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { formatDealMoney } from '@/features/deals/dealCurrencies'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetPaymentsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection, ReportStatusBadge } from '@/features/analytics/ReportLayout'

const SLICES = CHART_COLORS.slices
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

export function PaymentsTab({ queryParams }) {
  const fmtMoney = useFormatChartCurrency()
  const ledgerCols = [
    { field: 'lead', headerName: 'Lead', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
    { field: 'source', headerName: 'Source', renderCell: ({ value }) => <span className="capitalize">{value}</span> },
    { field: 'deal', headerName: 'Deal / Invoice' },
    { field: 'amount', headerName: 'Amount', renderCell: ({ value, row }) => <span className="font-semibold text-emerald-700">{formatDealMoney(value, row.currency)}</span> },
    { field: 'mode', headerName: 'Mode', renderCell: ({ value }) => <span className="capitalize">{String(value).replace(/_/g, ' ')}</span> },
    { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
    { field: 'date', headerName: 'Date', renderCell: ({ value }) => fmtDate(value) },
  ]
  const { data, isLoading } = useGetPaymentsReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const ledger = d?.tables?.ledger || []

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total received" value={fmtMoney(kpis.totalReceived)} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Deal payments" value={fmtMoney(kpis.dealPayments)} icon={Briefcase} />
          <ReportKpiCard label="Invoice payments" value={fmtMoney(kpis.invoicePayments)} icon={Receipt} />
          <ReportKpiCard label="Payment count" value={(kpis.dealPaymentCount ?? 0) + (kpis.invoicePaymentCount ?? 0)} icon={CreditCard} />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Payments by mode">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.byMode || []} dataKey="value" nameKey="mode" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(charts.byMode || []).map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Payments by status">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.byStatus || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmtMoney(v)} />
                <Bar dataKey="value" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Payment ledger by lead" subtitle="All deal and invoice payments in period">
        <DataGrid
          columns={ledgerCols}
          data={ledger}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[480px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No payments in this period"
        />
      </ReportTableSection>
    </div>
  )
}
