import { CalendarCheck, AlertTriangle, CheckCircle, Percent } from '@/components/ui/icons'
import { useIsElevated } from '@/hooks/useRoleRank'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetFollowupsReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection, ReportStatusBadge } from '@/features/analytics/ReportLayout'

const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—'

const LINEUP_COLS = [
  { field: 'lead', headerName: 'Lead', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'scheduledAt', headerName: 'Scheduled', renderCell: ({ value }) => fmtDate(value) },
  { field: 'assignee', headerName: 'Assignee' },
  { field: 'remark', headerName: 'Note', renderCell: ({ value }) => <span className="text-xs text-ink-muted">{value || '—'}</span> },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
]

const OVERDUE_COLS = [
  ...LINEUP_COLS,
  { field: 'daysOverdue', headerName: 'Days overdue', renderCell: ({ value }) => <span className="font-semibold text-rose-600">{value ?? 0}</span> },
]

export function FollowupsTab({ queryParams }) {
  // Team-comparative widgets hide for rank-3 users (self-scoped data).
  const isElevated = useIsElevated()

  const { data, isLoading } = useGetFollowupsReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const tables = d?.tables || {}

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Upcoming" value={kpis.upcoming ?? 0} icon={CalendarCheck} />
          <ReportKpiCard label="Overdue" value={kpis.overdue ?? 0} icon={AlertTriangle} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Completed (period)" value={kpis.completedInPeriod ?? 0} icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Total (period)" value={kpis.totalInPeriod ?? 0} icon={CalendarCheck} />
          <ReportKpiCard label="Completion rate" value={`${kpis.completionRate ?? 0}%`} icon={Percent} />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
{isElevated ? (<>
        <DashboardChartCard title="Follow-ups by assignee" subtitle="Created vs completed in period" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.byAssignee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="created" name="Created" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" name="Done" fill={CHART_COLORS.success} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
</>) : null}
      </ReportChartGrid>

      <ReportTableSection title="Upcoming follow-ups lineup" subtitle="Scheduled next — act before they become overdue">
        <DataGrid
          columns={isElevated ? LINEUP_COLS : LINEUP_COLS.filter((c) => c.field !== 'assignee')}
          data={tables.upcoming || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[360px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No upcoming follow-ups"
        />
      </ReportTableSection>

      <ReportTableSection title="Overdue follow-ups" subtitle="Past due — needs immediate attention">
        <DataGrid
          columns={isElevated ? OVERDUE_COLS : OVERDUE_COLS.filter((c) => c.field !== 'assignee')}
          data={tables.overdue || []}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[360px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No overdue follow-ups"
        />
      </ReportTableSection>
    </div>
  )
}
