import { Users, UserCheck, Shield, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'
import { useFormatChartCurrency } from '@/hooks/useEffectiveCurrency'
import { ReportKpiCard } from './ReportKpiCard'
import { ReportTable } from './ReportTable'
import { ChartSkeleton, KpiSkeleton } from './ChartSkeleton'
import { useGetTeamReportQuery } from '@/features/analytics/analyticsApi'
import { fmtReportDate } from '@/features/analytics/reportColumns'

const TEAM_COLS_BASE = [
  { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-ink">{v || '—'}</span> },
  { key: 'isAdmin', label: 'Role', render: (v) => v
    ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Admin</span>
    : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Member</span>
  },
  { key: 'isActive', label: 'Status', render: (v) => v
    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
    : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
  },
  { key: 'leadsOwned', label: 'Leads owned', render: (v) => <span className="font-semibold text-ink">{v}</span> },
  { key: 'leadsAssigned', label: 'Assigned', render: (v) => v ?? 0 },
  { key: 'deals', label: 'Deals', render: (v) => <span className="font-semibold">{v ?? 0}</span> },
  { key: 'pipelineValue', label: 'Pipeline value' },
  { key: 'wonValue', label: 'Won value' },
  { key: 'tasksOpen', label: 'Open tasks', render: (v) => <span className="font-semibold">{v ?? 0}</span> },
  { key: 'tasksOverdue', label: 'Overdue', render: (v) => <span className={v > 0 ? 'font-semibold text-rose-600' : ''}>{v ?? 0}</span> },
  { key: 'tasksCompleted', label: 'Done (period)', render: (v) => <span className="text-emerald-700">{v ?? 0}</span> },
  { key: 'meetings', label: 'Meetings', render: (v) => v ?? 0 },
  { key: 'activities', label: 'Activities', render: (v) => v ?? 0 },
  { key: 'lastActive', label: 'Last login', render: (v) => fmtReportDate(v) },
]

export function TeamTab({ queryParams, from, to }) {
  const fmtMoney = useFormatChartCurrency()
  const teamCols = TEAM_COLS_BASE.map((col) => {
    if (col.key === 'pipelineValue') {
      return { ...col, render: (v) => <span className="font-semibold text-blue-700">{fmtMoney(v)}</span> }
    }
    if (col.key === 'wonValue') {
      return { ...col, render: (v) => <span className="font-semibold text-emerald-700">{fmtMoney(v)}</span> }
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
    <div id="report-export-root" className="space-y-6">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />) : <>
          <ReportKpiCard label="Total members" value={kpis.total ?? 0} icon={Users} />
          <ReportKpiCard label="Active" value={kpis.active ?? 0} icon={UserCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <ReportKpiCard label="Admins" value={kpis.admins ?? 0} icon={Shield} iconBg="bg-purple-50" iconColor="text-purple-600" />
          <ReportKpiCard label="Avg leads / member" value={kpis.avgLeadsPerUser ?? 0} icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" />
        </>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue leaderboard */}
        <DashboardChartCard title="Revenue leaderboard" subtitle="Won deal value per team member">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.revenueByMember || []} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtMoney} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => [fmtMoney(v), 'Won value']} />
                <Bar dataKey="value" name="Won value" fill={CHART_COLORS.success} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        {/* Activity leaderboard */}
        <DashboardChartCard title="Activity leaderboard" subtitle="Total activities logged per member">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.activitiesByMember || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Activities" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
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
                <Bar yAxisId="left" dataKey="deals" name="Deals" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="wonValue" name="Won value" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Leads owned" subtitle="Lead count per team member">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.leadsByMember || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Leads" fill={CHART_COLORS.info} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>

        <DashboardChartCard title="Meetings per member" subtitle="Meetings held in period">
          {isLoading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.meetingsByMember || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" name="Meetings" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
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
                <Bar dataKey="count" name="Completed tasks" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardChartCard>
      </div>

      <DashboardChartCard title="Full team performance table" subtitle="All metrics per team member in selected period">
        <ReportTable columns={teamCols} rows={teamRows} loading={isLoading} emptyText="No team members found" maxHeightClass="max-h-[480px]" />
      </DashboardChartCard>
    </div>
  )
}
