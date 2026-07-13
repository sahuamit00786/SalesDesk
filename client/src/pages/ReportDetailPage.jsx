import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
import { useGetLeadFormMetaQuery } from '@/features/leads/leadsApi'
import { STATUS_OPTIONS as LEAD_STATUS_OPTIONS, SOURCE_LABELS as LEAD_SOURCE_LABELS } from '@/features/leads/constants'
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

const LEAVE_STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'cancelled']

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

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

  const { data: formMetaData } = useGetLeadFormMetaQuery()
  const dealStatuses = useMemo(() => formMetaData?.data?.dealStatuses || [], [formMetaData])
  const opportunityStatuses = useMemo(() => formMetaData?.data?.opportunityStatuses || [], [formMetaData])

  const stageOptions = useMemo(() => {
    // Deal.stage stores the stage name directly; Lead.opportunityStatus is a FK id.
    if (type === 'deals') {
      const source = dealStatuses.length ? dealStatuses : opportunityStatuses
      return source.map((s) => s.name).filter(Boolean).map((name) => ({ value: name, label: name }))
    }
    if (type === 'opportunities') {
      return opportunityStatuses.filter((s) => s.id && s.name).map((s) => ({ value: s.id, label: s.name }))
    }
    return []
  }, [type, dealStatuses, opportunityStatuses])

  const statusOptions = useMemo(() => {
    if (type === 'leads' || type === 'opportunities') {
      return LEAD_STATUS_OPTIONS.map((s) => ({ value: s, label: capitalize(s) }))
    }
    if (type === 'leave') {
      return LEAVE_STATUS_OPTIONS.map((s) => ({ value: s, label: capitalize(s) }))
    }
    return []
  }, [type])

  const sourceOptions = useMemo(() => {
    if (type !== 'leads') return []
    return Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }))
  }, [type])

  const { data: leadsData, refetch: refetchLeads } = useGetLeadsReportQuery(filters.queryParams)
  const { data: dealsData, refetch: refetchDeals } = useGetDealsReportQuery(filters.queryParams)
  const { data: actData, refetch: refetchAct } = useGetActivitiesReportQuery(filters.queryParams)
  const { data: meetingsData, refetch: refetchMeetings } = useGetMeetingsReportQuery(filters.queryParams)
  const { data: tasksData, refetch: refetchTasks } = useGetTasksReportQuery(filters.queryParams)
  const { data: teamReportData, refetch: refetchTeam } = useGetTeamReportQuery(filters.queryParams)
  const { data: oppsData, refetch: refetchOpps } = useGetOpportunitiesReportQuery(filters.queryParams)
  const { data: followupsData, refetch: refetchFollowups } = useGetFollowupsReportQuery(filters.queryParams)
  const { data: salesDocsData, refetch: refetchSalesDocs } = useGetSalesDocsReportQuery(filters.queryParams)
  const { data: paymentsData, refetch: refetchPayments } = useGetPaymentsReportQuery(filters.queryParams)
  const { data: leaveData, refetch: refetchLeave } = useGetLeaveReportQuery(filters.queryParams)
  const { data: empMonthlyData, refetch: refetchEmpMonthly } = useGetEmployeeMonthlyReportQuery(filters.queryParams)
  const { data: dataHealthData, refetch: refetchDataHealth } = useGetDataHealthReportQuery(filters.queryParams)

  const TabComponent = TAB_MAP[type]

  const DATA_BY_TYPE = {
    overview: leadsData, leads: leadsData, deals: dealsData, activities: actData,
    meetings: meetingsData, tasks: tasksData, team: teamReportData, opportunities: oppsData,
    followups: followupsData, 'sales-docs': salesDocsData, payments: paymentsData,
    leave: leaveData, 'employee-monthly': empMonthlyData, 'data-health': dataHealthData,
  }
  const REFETCH_BY_TYPE = {
    overview: refetchLeads, leads: refetchLeads, deals: refetchDeals, activities: refetchAct,
    meetings: refetchMeetings, tasks: refetchTasks, team: refetchTeam, opportunities: refetchOpps,
    followups: refetchFollowups, 'sales-docs': refetchSalesDocs, payments: refetchPayments,
    leave: refetchLeave, 'employee-monthly': refetchEmpMonthly, 'data-health': refetchDataHealth,
  }
  const hasData = Boolean(DATA_BY_TYPE[type]?.data)
  const handleRefresh = () => REFETCH_BY_TYPE[type]?.()
  const handlePrint = () => window.print()

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
      <PageStack className="gap-2">
        <PageContentPanel className="no-print border-surface-border !p-2.5 sm:!p-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="icon"
              className="border border-surface-border"
              onClick={() => navigate('/reports')}
              aria-label="Back to reports"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Icon className="h-4 w-4 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{meta.label}</p>
              <p className="text-xs text-ink-muted">{meta.desc}</p>
            </div>
          </div>
        </PageContentPanel>

        <ReportFilterBar
          className="no-print"
          filters={filters}
          meta={meta}
          teamUsers={teamUsers}
          statusOptions={statusOptions}
          stageOptions={stageOptions}
          sourceOptions={sourceOptions}
          exportSlot={(
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="icon"
                className="border border-surface-border"
                onClick={handleRefresh}
                aria-label="Refresh report data"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <ReportExportMenu
                onExportXlsx={EXPORTABLE.has(type) ? handleExportXlsx : undefined}
                onExportPdf={handleExportPdf}
                onPrint={handlePrint}
                disabled={!hasData}
              />
            </div>
          )}
        />

        <PageContentPanel className="border-surface-border !p-2.5 sm:!p-3">
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
