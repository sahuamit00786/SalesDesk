import { Umbrella, CalendarCheck, Clock, XCircle } from '@/components/ui/icons'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { useGetLeaveReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection, ReportStatusBadge } from '@/features/analytics/ReportLayout'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const LEAVE_COLS = [
  { field: 'employee', headerName: 'Employee', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'leaveType', headerName: 'Leave type' },
  { field: 'fromDate', headerName: 'From', renderCell: ({ value }) => fmtDate(value) },
  { field: 'toDate', headerName: 'To', renderCell: ({ value }) => fmtDate(value) },
  { field: 'days', headerName: 'Days', renderCell: ({ value }) => <span className="font-semibold">{value}</span> },
  { field: 'status', headerName: 'Status', renderCell: ({ value }) => <ReportStatusBadge status={value} /> },
]

export function LeaveTab({ queryParams }) {
  const { data, isLoading } = useGetLeaveReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const requests = d?.tables?.requests || []

  return (
    <div id="report-export-root" className="space-y-4">
      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total requests" value={kpis.totalRequests ?? 0} icon={Umbrella} />
          <ReportKpiCard label="Approved days" value={kpis.approvedDays ?? 0} icon={CalendarCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Pending" value={kpis.pendingRequests ?? 0} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <ReportKpiCard label="Rejected" value={kpis.rejected ?? 0} icon={XCircle} iconBg="bg-rose-50" iconColor="text-rose-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Leave by type" subtitle="Approved days per leave type">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.byType || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="days" name="Days" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Leave by employee" subtitle="Approved vs pending days">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.byEmployee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="approved" name="Approved" fill={CHART_COLORS.success} maxBarSize={24} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill={CHART_COLORS.warning} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Leave requests" subtitle="By employee and leave type in selected period">
        <DataGrid
          columns={LEAVE_COLS}
          data={requests}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[480px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No leave requests in this period"
        />
      </ReportTableSection>
    </div>
  )
}
