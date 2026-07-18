import { baseApi } from '@/features/api/baseApi'

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardStats: build.query({
      query: () => '/analytics/dashboard',
      providesTags: [{ type: 'Analytics', id: 'DASHBOARD' }],
    }),
    getDashboardSummary: build.query({
      query: () => '/analytics/dashboard-summary',
      providesTags: [{ type: 'Analytics', id: 'DASHBOARD_SUMMARY' }],
    }),
    getNavBadges: build.query({
      query: () => '/analytics/nav-badges',
      providesTags: [{ type: 'Analytics', id: 'NAV_BADGES' }],
    }),
    getDashboardCharts: build.query({
      query: (params) => ({ url: '/analytics/dashboard-charts', params }),
      providesTags: [{ type: 'Analytics', id: 'DASHBOARD_CHARTS' }],
    }),
    getLeadsReport: build.query({
      query: (params) => ({ url: '/analytics/leads-report', params }),
      providesTags: [{ type: 'Analytics', id: 'LEADS_REPORT' }],
    }),
    getPipelineReport: build.query({
      query: (params) => ({ url: '/analytics/pipeline-report', params }),
      providesTags: [{ type: 'Analytics', id: 'PIPELINE_REPORT' }],
    }),
    getOpportunitiesReport: build.query({
      query: (params) => ({ url: '/analytics/opportunities-report', params }),
      providesTags: [{ type: 'Analytics', id: 'OPPORTUNITIES_REPORT' }],
    }),
    getActivitiesReport: build.query({
      query: (params) => ({ url: '/analytics/activities-report', params }),
      providesTags: [{ type: 'Analytics', id: 'ACTIVITIES_REPORT' }],
    }),
    getMeetingsReport: build.query({
      query: (params) => ({ url: '/analytics/meetings-report', params }),
      providesTags: [{ type: 'Analytics', id: 'MEETINGS_REPORT' }],
    }),
    getTasksReport: build.query({
      query: (params) => ({ url: '/analytics/tasks-report', params }),
      providesTags: [{ type: 'Analytics', id: 'TASKS_REPORT' }],
    }),
    getTeamReport: build.query({
      query: (params) => ({ url: '/analytics/team-report', params }),
      providesTags: [{ type: 'Analytics', id: 'TEAM_REPORT' }],
    }),
    getDealsReport: build.query({
      query: (params) => ({ url: '/analytics/deals-report', params }),
      providesTags: [{ type: 'Analytics', id: 'DEALS_REPORT' }],
    }),
    getFollowupsReport: build.query({
      query: (params) => ({ url: '/analytics/followups-report', params }),
      providesTags: [{ type: 'Analytics', id: 'FOLLOWUPS_REPORT' }],
    }),
    getSalesDocsReport: build.query({
      query: (params) => ({ url: '/analytics/sales-docs-report', params }),
      providesTags: [{ type: 'Analytics', id: 'SALES_DOCS_REPORT' }],
    }),
    getPaymentsReport: build.query({
      query: (params) => ({ url: '/analytics/payments-report', params }),
      providesTags: [{ type: 'Analytics', id: 'PAYMENTS_REPORT' }],
    }),
    getLeaveReport: build.query({
      query: (params) => ({ url: '/analytics/leave-report', params }),
      providesTags: [{ type: 'Analytics', id: 'LEAVE_REPORT' }],
    }),
    getEmployeeMonthlyReport: build.query({
      query: (params) => ({ url: '/analytics/employee-monthly-report', params }),
      providesTags: [{ type: 'Analytics', id: 'EMPLOYEE_MONTHLY_REPORT' }],
    }),
    getDataHealthReport: build.query({
      query: (params) => ({ url: '/analytics/data-health-report', params }),
      providesTags: [{ type: 'Analytics', id: 'DATA_HEALTH_REPORT' }],
    }),
    getCampaignsReport: build.query({
      query: (params) => ({ url: '/analytics/campaigns-report', params }),
      providesTags: [{ type: 'Analytics', id: 'CAMPAIGNS_REPORT' }],
    }),
  }),
})

export const {
  useGetDashboardStatsQuery,
  useGetDashboardSummaryQuery,
  useGetNavBadgesQuery,
  useGetDashboardChartsQuery,
  useGetLeadsReportQuery,
  useGetPipelineReportQuery,
  useGetOpportunitiesReportQuery,
  useGetActivitiesReportQuery,
  useGetMeetingsReportQuery,
  useGetTasksReportQuery,
  useGetTeamReportQuery,
  useGetDealsReportQuery,
  useGetFollowupsReportQuery,
  useGetSalesDocsReportQuery,
  useGetPaymentsReportQuery,
  useGetLeaveReportQuery,
  useGetEmployeeMonthlyReportQuery,
  useGetDataHealthReportQuery,
  useGetCampaignsReportQuery,
} = analyticsApi
