import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PageStack } from '@/components/layout/PageStack'
import { PageContentPanel } from '@/components/layout/PageContentPanel'
import { OverviewTab } from '@/features/analytics/components/OverviewTab'
import { LeadsTab } from '@/features/analytics/components/LeadsTab'
import { DealsTab } from '@/features/analytics/components/DealsTab'
import { ActivitiesTab } from '@/features/analytics/components/ActivitiesTab'
import { MeetingsTab } from '@/features/analytics/components/MeetingsTab'
import { TasksTab } from '@/features/analytics/components/TasksTab'
import { TeamTab } from '@/features/analytics/components/TeamTab'
import { OpportunitiesTab } from '@/features/analytics/components/OpportunitiesTab'
import { FollowupsTab } from '@/features/analytics/components/FollowupsTab'
import { SalesDocsTab } from '@/features/analytics/components/SalesDocsTab'
import { PaymentsTab } from '@/features/analytics/components/PaymentsTab'
import { EmployeeMonthlyTab } from '@/features/analytics/components/EmployeeMonthlyTab'
import { LeaveTab } from '@/features/analytics/components/LeaveTab'
import { DataHealthTab } from '@/features/analytics/components/DataHealthTab'
import { CampaignsTab } from '@/features/analytics/components/CampaignsTab'
import { EmailReportTab } from '@/features/analytics/components/EmailReportTab'
import { useReportFilters } from '@/features/analytics/useReportFilters'
import { ReportFilterBar } from '@/features/analytics/ReportFilterBar'
import { ReportExportMenu } from '@/features/analytics/ReportExportMenu'
import { getReportMeta } from '@/features/analytics/reportTypes'
import { useTeamUsersQuery } from '@/features/team/teamApi'
import { exportReportPdf } from '@/features/analytics/exportPdf'
import {
  exportOverview, exportLeads, exportDeals, exportActivities,
  exportMeetings, exportTasks, exportTeam,
  exportOpportunities, exportFollowups, exportSalesDocs, exportPayments,
  exportLeave, exportEmployeeMonthly, exportDataHealth,
} from '@/features/analytics/exportXlsx'
import {
  useGetLeadsReportQuery, useGetDealsReportQuery, useGetActivitiesReportQuery,
  useGetMeetingsReportQuery, useGetTasksReportQuery, useGetTeamReportQuery,
  useGetOpportunitiesReportQuery, useGetFollowupsReportQuery, useGetSalesDocsReportQuery,
  useGetPaymentsReportQuery, useGetLeaveReportQuery, useGetEmployeeMonthlyReportQuery,
  useGetDataHealthReportQuery,
} from '@/features/analytics/analyticsApi'

const TAB_MAP = {
  overview: OverviewTab,
  leads: LeadsTab,
  opportunities: OpportunitiesTab,
  deals: DealsTab,
  pipeline: DealsTab,
  'sales-docs': SalesDocsTab,
  payments: PaymentsTab,
  tasks: TasksTab,
  followups: FollowupsTab,
  activities: ActivitiesTab,
  meetings: MeetingsTab,
  'employee-monthly': EmployeeMonthlyTab,
  team: TeamTab,
  leave: LeaveTab,
  email: EmailReportTab,
  campaigns: CampaignsTab,
  'data-health': DataHealthTab,
}

export function ReportDetailPage() {
  const { type: rawType } = useParams()
  const navigate = useNavigate()
  const type = rawType === 'pipeline' ? 'deals' : rawType
  const meta = getReportMeta(type)
  const Icon = meta.icon
  const filters = useReportFilters()
  const { data: teamData } = useTeamUsersQuery()
  const teamUsers = Array.isArray(teamData?.data?.items) ? teamData.data.items : []

  const { data: leadsData } = useGetLeadsReportQuery(filters.queryParams)
  const { data: dealsData } = useGetDealsReportQuery(filters.queryParams)
  const { data: actData } = useGetActivitiesReportQuery(filters.queryParams)
  const { data: meetingsData } = useGetMeetingsReportQuery(filters.queryParams)
  const { data: tasksData } = useGetTasksReportQuery(filters.queryParams)
  const { data: teamReportData } = useGetTeamReportQuery(filters.queryParams)
  const { data: oppsData } = useGetOpportunitiesReportQuery(filters.queryParams)
  const { data: followupsData } = useGetFollowupsReportQuery(filters.queryParams)
  const { data: salesDocsData } = useGetSalesDocsReportQuery(filters.queryParams)
  const { data: paymentsData } = useGetPaymentsReportQuery(filters.queryParams)
  const { data: leaveData } = useGetLeaveReportQuery(filters.queryParams)
  const { data: empMonthlyData } = useGetEmployeeMonthlyReportQuery(filters.queryParams)
  const { data: dataHealthData } = useGetDataHealthReportQuery(filters.queryParams)

  const TabComponent = TAB_MAP[type]

  const EXPORTABLE = new Set([
    'overview', 'leads', 'deals', 'activities', 'meetings', 'tasks', 'team',
    'opportunities', 'followups', 'sales-docs', 'payments', 'leave', 'employee-monthly', 'data-health',
  ])

  function handleExportXlsx() {
    const p = { from: filters.from, to: filters.to }
    if (type === 'overview') exportOverview({ leads: leadsData?.data, pipeline: dealsData?.data, act: actData?.data, tasks: tasksData?.data, team: teamReportData?.data, ...p })
    else if (type === 'leads') exportLeads({ data: leadsData?.data, ...p })
    else if (type === 'deals') exportDeals({ data: dealsData?.data, ...p })
    else if (type === 'activities') exportActivities({ data: actData?.data, ...p })
    else if (type === 'meetings') exportMeetings({ data: meetingsData?.data, ...p })
    else if (type === 'tasks') exportTasks({ data: tasksData?.data, ...p })
    else if (type === 'team') exportTeam({ data: teamReportData?.data, ...p })
    else if (type === 'opportunities') exportOpportunities({ data: oppsData?.data, ...p })
    else if (type === 'followups') exportFollowups({ data: followupsData?.data, ...p })
    else if (type === 'sales-docs') exportSalesDocs({ data: salesDocsData?.data, ...p })
    else if (type === 'payments') exportPayments({ data: paymentsData?.data, ...p })
    else if (type === 'leave') exportLeave({ data: leaveData?.data, ...p })
    else if (type === 'employee-monthly') exportEmployeeMonthly({ data: empMonthlyData?.data, ...p })
    else if (type === 'data-health') exportDataHealth({ data: dataHealthData?.data, ...p })
  }

  function handleExportPdf() {
    exportReportPdf({ title: `${meta.label} Report`, elementId: 'report-export-root' })
  }

  return (
    <PageShell fullWidth>
      <PageStack>
        <PageContentPanel>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-ink-muted hover:bg-surface-subtle"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${meta.iconGrad}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{meta.label}</p>
              <p className="text-xs text-ink-muted">{meta.desc}</p>
            </div>
          </div>
        </PageContentPanel>

        <ReportFilterBar
          filters={filters}
          meta={meta}
          teamUsers={teamUsers}
          exportSlot={(
            <ReportExportMenu
              onExportXlsx={EXPORTABLE.has(type) ? handleExportXlsx : undefined}
              onExportPdf={handleExportPdf}
            />
          )}
        />

        <PageContentPanel>
          {TabComponent ? (
            <TabComponent queryParams={filters.queryParams} from={filters.from} to={filters.to} />
          ) : (
            <div className="py-16 text-center text-ink-muted">
              <p className="font-semibold">Report not found</p>
              <button type="button" onClick={() => navigate('/reports')} className="mt-2 text-sm text-brand-600 hover:underline">
                Back to Reports
              </button>
            </div>
          )}
        </PageContentPanel>
      </PageStack>
    </PageShell>
  )
}
