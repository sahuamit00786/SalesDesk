import { CalendarCheck, AlertTriangle, CheckCircle, Percent } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetFollowupsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—'

const LINEUP_COLS = [
  { key: 'lead', label: 'Lead', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'scheduledAt', label: 'Scheduled', render: (v) => fmtDate(v) },
  { key: 'assignee', label: 'Assignee' },
  { key: 'remark', label: 'Note', render: (v) => <span className="text-xs text-ink-muted">{v || '—'}</span> },
  { key: 'status', label: 'Status' },
]

const OVERDUE_COLS = [
  ...LINEUP_COLS,
  { key: 'daysOverdue', label: 'Days overdue', render: (v) => <span className="font-semibold text-rose-600">{v ?? 0}</span> },
]

export function FollowupsTab({ queryParams }) {
  const { data, isLoading } = useGetFollowupsReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const tables = d?.tables || {}

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Upcoming" value={kpis.upcoming ?? 0} icon={CalendarCheck} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <ReportKpiCard label="Overdue" value={kpis.overdue ?? 0} icon={AlertTriangle} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Completed (period)" value={kpis.completedInPeriod ?? 0} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Total (period)" value={kpis.totalInPeriod ?? 0} icon={CalendarCheck} />
          <ReportKpiCard label="Completion rate" value={`${kpis.completionRate ?? 0}%`} icon={Percent} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Follow-ups by assignee" subtitle="Created vs completed in period" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.byAssignee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="created" name="Created" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Upcoming follow-ups lineup" subtitle="Scheduled next — act before they become overdue">
        <ReportTable columns={LINEUP_COLS} rows={tables.upcoming || []} isLoading={isLoading} maxH="max-h-[360px]" />
      </ReportTableSection>

      <ReportTableSection title="Overdue follow-ups" subtitle="Past due — needs immediate attention">
        <ReportTable columns={OVERDUE_COLS} rows={tables.overdue || []} isLoading={isLoading} maxH="max-h-[360px]" />
      </ReportTableSection>
    </div>
  )
}
