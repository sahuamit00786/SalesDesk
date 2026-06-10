import { Megaphone, Users, Target } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetCampaignsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const CAMP_COLS = [
  { key: 'name', label: 'Campaign', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'status', label: 'Status', render: (v) => <span className="capitalize">{v}</span> },
  { key: 'leadsStaged', label: 'Leads staged', render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'target', label: 'Target' },
  { key: 'endDate', label: 'End date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
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
          <ReportKpiCard label="Leads staged (period)" value={kpis.leadsStagedInPeriod ?? 0} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="Total staged" value={kpis.totalStaged ?? 0} icon={Target} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Leads by campaign" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.byCampaign || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Campaign performance" subtitle="All campaigns with leads staged">
        <ReportTable columns={CAMP_COLS} rows={campaigns} isLoading={isLoading} maxH="max-h-[400px]" />
      </ReportTableSection>
    </div>
  )
}
