import { Users, UserCheck, Shield, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { DataGrid } from '@/components/shared/DataGrid'
import { ReportKpiCard } from './ReportKpiCard'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetTeamReportQuery } from '@/features/analytics/analyticsApi'
import { fmtReportDate } from '@/features/analytics/reportColumns'
import { ReportTableSection } from '@/features/analytics/ReportLayout'

const TEAM_COLS_BASE = [
  { field: 'name', headerName: 'Name', renderCell: ({ value }) => <span className="font-medium text-ink">{value || '—'}</span> },
  { field: 'isAdmin', headerName: 'Role', renderCell: ({ value }) => value
    ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink">Admin</span>
    : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Member</span>
  },
  { field: 'isActive', headerName: 'Status', renderCell: ({ value }) => value
    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
    : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
  },
  { field: 'leadsOwned', headerName: 'Leads owned', renderCell: ({ value }) => <span className="font-semibold text-ink">{value}</span> },
  { field: 'leadsAssigned', headerName: 'Assigned', renderCell: ({ value }) => value ?? 0 },
  { field: 'deals', headerName: 'Deals', renderCell: ({ value }) => <span className="font-semibold">{value ?? 0}</span> },
  { field: 'pipelineValue', headerName: 'Pipeline value' },
  { field: 'wonValue', headerName: 'Won value' },
  { field: 'tasksOpen', headerName: 'Open tasks', renderCell: ({ value }) => <span className="font-semibold">{value ?? 0}</span> },
  { field: 'tasksOverdue', headerName: 'Overdue', renderCell: ({ value }) => <span className={value > 0 ? 'font-semibold text-rose-600' : ''}>{value ?? 0}</span> },
  { field: 'tasksCompleted', headerName: 'Done (period)', renderCell: ({ value }) => <span className="text-emerald-700">{value ?? 0}</span> },
  { field: 'meetings', headerName: 'Meetings', renderCell: ({ value }) => value ?? 0 },
  { field: 'activities', headerName: 'Activities', renderCell: ({ value }) => value ?? 0 },
  { field: 'lastActive', headerName: 'Last login', renderCell: ({ value }) => fmtReportDate(value) },
]

export function TeamTab({ queryParams, from, to }) {
  const fmtMoney = useFormatChartCurrency()
  const teamCols = TEAM_COLS_BASE.map((col) => {
    if (col.field === 'pipelineValue') {
      return { ...col, renderCell: ({ value }) => <span className="font-semibold text-ink">{fmtMoney(value)}</span> }
    }
    if (col.field === 'wonValue') {
      return { ...col, renderCell: ({ value }) => <span className="font-semibold text-emerald-700">{fmtMoney(value)}</span> }
    }
    return col
  })
  const params = queryParams || { from, to }
  const { data, isLoading } = useGetTeamReportQuery(params)
  const d = data?.data
  const kpis = d?.kpis || {}
  const charts = d?.charts || {}
  const teamRows = d?.tables?.team || []

  return (
    <div id="report-export-root" className="space-y-4">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total members" value={kpis.total ?? 0} icon={Users} />
          <ReportKpiCard label="Active" value={kpis.active ?? 0} icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Admins" value={kpis.admins ?? 0} icon={Shield} />
          <ReportKpiCard label="Avg leads / member" value={kpis.avgLeadsPerUser ?? 0} icon={TrendingUp} />
        </>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue leaderboard */}
        <DashboardChartCard title="Revenue leaderboard" subtitle="Won deal value per team member">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.revenueByMember || []} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtMoney} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => [fmtMoney(v), 'Won value']} />
                <Bar dataKey="value" name="Won value" fill={CHART_COLORS.success} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Activity leaderboard */}
        <DashboardChartCard title="Activity leaderboard" subtitle="Total activities logged per member">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.activitiesByMember || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Activities" fill={CHART_COLORS.primary} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Deals by member — grouped */}
        <DashboardChartCard title="Deals per member" subtitle="Pipeline value and deal count" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.dealsByMember || []} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={fmtMoney} />
                <Tooltip formatter={(v, name) => name === 'pipelineValue' || name === 'wonValue' ? [fmtMoney(v), name] : [v, name]} />
                <Legend />
                <Bar yAxisId="left" dataKey="deals" name="Deals" fill={CHART_COLORS.primary} maxBarSize={24} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="wonValue" name="Won value" fill={CHART_COLORS.success} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Leads owned" subtitle="Lead count per team member">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.leadsByMember || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.info} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Meetings per member" subtitle="Meetings held in period">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.meetingsByMember || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Meetings" fill={CHART_COLORS.secondary} maxBarSize={24} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Tasks completed" subtitle="Completed task count in period per member" className="lg:col-span-2">
          {isLoading ? <ChartSkeleton height={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.tasksByMember || []} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Completed tasks" fill={CHART_COLORS.success} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      <ReportTableSection title="Full team performance table" subtitle="All metrics per team member in selected period">
        <DataGrid
          columns={teamCols}
          data={teamRows}
          loading={isLoading}
          showColumnToggle={false}
          showExportCsv={false}
          autoHeight={false}
          maxHeightClass="max-h-[480px]"
          className="rounded-none border-0 shadow-none"
          emptyTitle="No team members found"
        />
      </ReportTableSection>
    </div>
  )
}
