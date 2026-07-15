import { Megaphone, Users, Target } from '@/components/ui/icons'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetCampaignsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection, ReportStatusBadge } from '@/features/analytics/ReportLayout'

const CAMP_COLS = [
  { field: 'name', headerName: 'Campaign', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
  { field: 'leadsStaged', headerName: 'Leads staged', renderCell: ({ value }) => <span className="font-semibold">{value}</span> },
  { field: 'target', headerName: 'Target' },
  { field: 'endDate', headerName: 'End date', renderCell: ({ value }) => value ? new Date(value).toLocaleDateString() : '—' },
]

export function CampaignsTab({ queryParams }) {
  const { data, isLoading } = useGetCampaignsReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const campaigns = d?.tables?.campaigns || []

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Active campaigns" value={kpis.activeCampaigns ?? 0} icon={Megaphone} />
          <ReportKpiCard label="Leads staged (period)" value={kpis.leadsStagedInPeriod ?? 0} icon={Users} />
          <ReportKpiCard label="Total staged" value={kpis.totalStaged ?? 0} icon={Target} />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Leads by campaign" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.byCampaign || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Campaign performance" subtitle="All campaigns with leads staged">
        <DataGrid
          columns={CAMP_COLS}
          data={campaigns}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[400px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No campaigns with staged leads"
        />
      </ReportTableSection>
    </div>
  )
}
