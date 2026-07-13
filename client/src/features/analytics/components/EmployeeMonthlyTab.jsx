import { UserCircle, Activity, CheckSquare, Trophy } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetEmployeeMonthlyReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const EMP_COLS_BASE = [
  { field: 'name', headerName: 'Employee', renderCell: ({ value }) => <span className="font-medium text-ink">{value}</span> },
  { field: 'leadsCreated', headerName: 'Leads created' },
  { field: 'calls', headerName: 'Calls' },
  { field: 'emails', headerName: 'Emails' },
  { field: 'totalActivities', headerName: 'Activities' },
  { field: 'tasksCompleted', headerName: 'Tasks done' },
  { field: 'meetingsHeld', headerName: 'Meetings' },
  { field: 'followupsDone', headerName: 'Follow-ups' },
  { field: 'dealsWon', headerName: 'Deals won' },
  { field: 'dealsWonValue', headerName: 'Won value' },
]

export function EmployeeMonthlyTab({ queryParams }) {
  const fmtMoney = useFormatChartCurrency()
  const empCols = EMP_COLS_BASE.map((col) => (
    col.field === 'dealsWonValue'
      ? { ...col, renderCell: ({ value }) => fmtMoney(value) }
      : col
  ))
  const { data, isLoading } = useGetEmployeeMonthlyReportQuery(queryParams)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const employees = d?.tables?.employees || []

  const monthName = kpis.month ? new Date(2000, kpis.month - 1, 1).toLocaleString('default', { month: 'long' }) : ''

  return (
    <div id="report-export-root" className="space-y-4">
      <p className="rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2 text-sm text-ink">
        Monthly digest for <span className="font-semibold">{monthName} {kpis.year}</span> — everything each employee did this month.
      </p>

      <ReportKpiGrid>
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Employees" value={kpis.employees ?? 0} icon={UserCircle} />
          <ReportKpiCard label="Total activities" value={kpis.totalActivities ?? 0} icon={Activity} />
          <ReportKpiCard label="Tasks completed" value={kpis.totalTasksCompleted ?? 0} icon={CheckSquare} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Deals won" value={kpis.totalDealsWon ?? 0} icon={Trophy} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Activities by employee" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.activitiesByEmployee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Activities" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Employee monthly breakdown" subtitle="Full activity detail per team member">
        <DataGrid
          columns={empCols}
          data={employees}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[480px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No employee activity in this period"
        />
      </ReportTableSection>
    </div>
  )
}
