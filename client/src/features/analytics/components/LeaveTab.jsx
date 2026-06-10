import { Umbrella, CalendarCheck, Clock, XCircle } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetLeaveReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

const LEAVE_COLS = [
  { key: 'employee', label: 'Employee', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'leaveType', label: 'Leave type' },
  { key: 'fromDate', label: 'From', render: (v) => fmtDate(v) },
  { key: 'toDate', label: 'To', render: (v) => fmtDate(v) },
  { key: 'days', label: 'Days', render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'status', label: 'Status', render: (v) => <span className="capitalize">{v}</span> },
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
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.byType || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="days" name="Days" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Leave by employee" subtitle="Approved vs pending days">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.byEmployee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Leave requests" subtitle="By employee and leave type in selected period">
        <ReportTable columns={LEAVE_COLS} rows={requests} isLoading={isLoading} maxH="max-h-[480px]" />
      </ReportTableSection>
    </div>
  )
}
