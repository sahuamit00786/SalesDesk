import { UserCircle, Activity, CheckSquare, Trophy, Phone } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetEmployeeMonthlyReportQuery } from '@/features/analytics/analyticsApi'
import { ReportKpiGrid, ReportChartGrid, ReportTableSection } from '@/features/analytics/ReportLayout'

const EMP_COLS_BASE = [
  { key: 'name', label: 'Employee', render: (v) => <span className="font-medium text-ink">{v}</span> },
  { key: 'leadsCreated', label: 'Leads created' },
  { key: 'calls', label: 'Calls' },
  { key: 'emails', label: 'Emails' },
  { key: 'totalActivities', label: 'Activities' },
  { key: 'tasksCompleted', label: 'Tasks done' },
  { key: 'meetingsHeld', label: 'Meetings' },
  { key: 'followupsDone', label: 'Follow-ups' },
  { key: 'dealsWon', label: 'Deals won' },
  { key: 'dealsWonValue', label: 'Won value' },
]

export function EmployeeMonthlyTab({ queryParams }) {
  const fmtMoney = useFormatChartCurrency()
  const empCols = EMP_COLS_BASE.map((col) => (
    col.key === 'dealsWonValue'
      ? { ...col, render: (v) => fmtMoney(v) }
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
          <ReportKpiCard label="Total activities" value={kpis.totalActivities ?? 0} icon={Activity} iconBg="bg-orange-50" iconColor="text-orange-600" />
          <ReportKpiCard label="Tasks completed" value={kpis.totalTasksCompleted ?? 0} icon={CheckSquare} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <ReportKpiCard label="Deals won" value={kpis.totalDealsWon ?? 0} icon={Trophy} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        </>}
      </ReportKpiGrid>

      <ReportChartGrid>
        <DashboardChartCard title="Activities by employee" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.activitiesByEmployee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Activities" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </ReportChartGrid>

      <ReportTableSection title="Employee monthly breakdown" subtitle="Full activity detail per team member">
        <ReportTable columns={empCols} rows={employees} isLoading={isLoading} maxH="max-h-[520px]" />
      </ReportTableSection>
    </div>
  )
}
