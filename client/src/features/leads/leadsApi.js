import { baseApi } from '@/features/api/baseApi'
import toast from 'react-hot-toast'

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLeads: build.query({
      query: (params) => ({
        url: '/leads',
        params,
      }),
      providesTags: [{ type: 'Lead', id: 'LIST' }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
        } catch (err) {
          toast.error(err?.error?.data?.error?.message || 'Something went wrong. Please try again.')
        }
      },
    }),
    getLeadIds: build.query({
      query: (params) => ({ url: '/leads/ids', params }),
    }),
    getLead: build.query({
      query: (id) => `/leads/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id }],
    }),
    getLeadFormMeta: build.query({
      query: () => '/leads/form-meta',
      providesTags: [{ type: 'Lead', id: 'FORM_META' }],
    }),
    getLeadSetup: build.query({
      query: () => '/leads/setup',
      providesTags: [{ type: 'Lead', id: 'SETUP' }],
    }),
    createLeadSource: build.mutation({
      query: (body) => ({ url: '/leads/setup/sources', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    updateLeadSource: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/setup/sources/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    deleteLeadSource: build.mutation({
      query: (id) => ({ url: `/leads/setup/sources/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    createLeadTag: build.mutation({
      query: (body) => ({ url: '/leads/setup/tags', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    updateLeadTag: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/setup/tags/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    deleteLeadTag: build.mutation({
      query: (id) => ({ url: `/leads/setup/tags/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    createPipelineStatus: build.mutation({
      query: (body) => ({ url: '/leads/setup/pipeline-statuses', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    updatePipelineStatus: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/setup/pipeline-statuses/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    deletePipelineStatus: build.mutation({
      query: (id) => ({ url: `/leads/setup/pipeline-statuses/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    reorderPipelineStatuses: build.mutation({
      query: (body) => ({ url: '/leads/setup/pipeline-statuses/reorder', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    createDealStatus: build.mutation({
      query: (body) => ({ url: '/leads/setup/deal-statuses', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    updateDealStatus: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/setup/deal-statuses/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    deleteDealStatus: build.mutation({
      query: (id) => ({ url: `/leads/setup/deal-statuses/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    reorderDealStatuses: build.mutation({
      query: (body) => ({ url: '/leads/setup/deal-statuses/reorder', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SETUP' }, { type: 'Lead', id: 'FORM_META' }],
    }),
    createLead: build.mutation({
      query: (body) => ({ url: '/leads', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }],
    }),
    updateLead: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: arg.id },
        { type: 'Lead', id: `${arg.id}-activities` },
        { type: 'Lead', id: 'LIST' },
        { type: 'Analytics', id: 'NAV_BADGES' },
      ],
    }),
    patchLeadStatus: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/status`, method: 'PATCH', body }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
        } catch (err) {
          toast.error(err?.error?.data?.error?.message || 'Something went wrong. Please try again.')
        }
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: arg.id },
        { type: 'Lead', id: `${arg.id}-activities` },
        { type: 'Lead', id: 'LIST' },
      ],
    }),
    deleteLead: build.mutation({
      query: (id) => ({ url: `/leads/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, { type: 'Lead', id: 'ARCHIVED_LIST' }, { type: 'Analytics', id: 'NAV_BADGES' }],
    }),
    bulkLeads: build.mutation({
      query: (body) => ({ url: '/leads/bulk', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, { type: 'Lead', id: 'ARCHIVED_LIST' }, { type: 'Analytics', id: 'NAV_BADGES' }],
    }),
    resolveLeadsByIds: build.mutation({
      query: (ids) => ({ url: '/leads/resolve-by-ids', method: 'POST', body: { ids } }),
    }),
    distributeLeadsRoundRobin: build.mutation({
      query: (body) => ({ url: '/leads/distribute-round-robin', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }, { type: 'Lead', id: 'ACTIVITIES_FEED' }, { type: 'Pipeline', id: 'LIST' }],
    }),
    getLeadActivities: build.query({
      query: ({ id, ...params }) => ({ url: `/leads/${id}/activities`, params }),
      providesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-activities` }],
    }),
    getGoogleEmailStatus: build.query({
      query: () => '/leads/email/google/status',
      providesTags: [{ type: 'Lead', id: 'GOOGLE_EMAIL_AUTH' }],
    }),
    getGoogleEmailConnectUrl: build.mutation({
      query: (returnTo) => ({
        url: '/leads/email/google/connect-url',
        method: 'GET',
        params: returnTo ? { returnTo } : undefined,
      }),
    }),
    completeGoogleEmailConnect: build.query({
      query: (params) => ({ url: '/leads/email/google/callback', params }),
      providesTags: [{ type: 'Lead', id: 'GOOGLE_EMAIL_AUTH' }],
    }),
    getLeadEmails: build.query({
      query: (id) => `/leads/${id}/emails`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id: `${id}-emails` }],
    }),
    getLeadEmailThreads: build.query({
      query: (id) => `/leads/${id}/email-threads`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id: `${id}-email-threads` }],
    }),
    getLeadEmailThread: build.query({
      query: ({ id, threadId }) => `/leads/${id}/email-threads/${threadId}`,
      providesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-email-thread-${arg.threadId}` },
        { type: 'Lead', id: `${arg.id}-email-threads` },
      ],
    }),
    sendLeadEmail: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/emails/send`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-emails` },
        { type: 'Lead', id: `${arg.id}-email-threads` },
        { type: 'Lead', id: `${arg.id}-activities` },
        { type: 'Lead', id: arg.id },
      ],
    }),
    syncLeadEmails: build.mutation({
      query: ({ id }) => ({ url: `/leads/${id}/emails/sync`, method: 'POST' }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-emails` }, { type: 'Lead', id: `${arg.id}-email-threads` }],
    }),
    getLeadNotes: build.query({
      query: (id) => `/leads/${id}/notes`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id: `${id}-notes` }],
    }),
    createLeadNote: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/notes`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-notes` }, { type: 'Lead', id: `${arg.id}-activities` }, { type: 'Lead', id: arg.id }],
    }),
    patchLeadNote: build.mutation({
      query: ({ id, noteId, ...body }) => ({ url: `/leads/${id}/notes/${noteId}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-notes` }, { type: 'Lead', id: `${arg.id}-activities` }, { type: 'Lead', id: arg.id }],
    }),
    deleteLeadNote: build.mutation({
      query: ({ id, noteId }) => ({ url: `/leads/${id}/notes/${noteId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-notes` }, { type: 'Lead', id: `${arg.id}-activities` }, { type: 'Lead', id: arg.id }],
    }),
    getLeadFiles: build.query({
      query: (id) => `/leads/${id}/files`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id: `${id}-files` }],
    }),
    createLeadActivity: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/activities`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-activities` }, { type: 'Lead', id: arg.id }],
    }),
    patchLeadActivity: build.mutation({
      query: ({ id, activityId, ...body }) => ({ url: `/leads/${id}/activities/${activityId}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-activities` }, { type: 'Lead', id: arg.id }],
    }),
    deleteLeadActivity: build.mutation({
      query: ({ id, activityId }) => ({ url: `/leads/${id}/activities/${activityId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: `${arg.id}-activities` }, { type: 'Lead', id: arg.id }],
    }),
    getLeadTasks: build.query({
      query: (id) => `/leads/${id}/tasks`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id: `${id}-tasks` }],
    }),
    createLeadTask: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/tasks`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-tasks` },
        { type: 'Lead', id: `${arg.id}-activities` },
        { type: 'Lead', id: 'ACTIVITIES_FEED' },
        { type: 'Lead', id: arg.id },
        { type: 'Task', id: 'LIST' },
        'CalendarEvents',
        'CalendarToday',
      ],
    }),
    patchLeadTask: build.mutation({
      query: ({ id, taskId, ...body }) => ({ url: `/leads/${id}/tasks/${taskId}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-tasks` },
        { type: 'Lead', id: `${arg.id}-activities` },
        { type: 'Lead', id: 'ACTIVITIES_FEED' },
        { type: 'Lead', id: arg.id },
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id: `TIMELINE-${arg.taskId}` },
        'CalendarEvents',
        'CalendarToday',
      ],
    }),
    deleteLeadTask: build.mutation({
      query: ({ id, taskId }) => ({ url: `/leads/${id}/tasks/${taskId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-tasks` },
        { type: 'Lead', id: `${arg.id}-activities` },
        { type: 'Lead', id: 'ACTIVITIES_FEED' },
        { type: 'Lead', id: arg.id },
        { type: 'Task', id: 'LIST' },
        'CalendarEvents',
        'CalendarToday',
      ],
    }),
    getLeadTaskTimeline: build.query({
      query: ({ id, taskId }) => `/leads/${id}/tasks/${taskId}/timeline`,
      providesTags: (_r, _e, arg) => [{ type: 'Task', id: `TIMELINE-${arg.taskId}` }],
    }),
    getLeadFollowups: build.query({
      query: (id) => `/leads/${id}/followups`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id: `${id}-followups` }],
    }),
    getAllFollowups: build.query({
      query: (params) => ({ url: '/followups', params }),
      providesTags: [{ type: 'Lead', id: 'ALL_FOLLOWUPS' }],
    }),
    createLeadFollowup: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/${id}/followups`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-followups` },
        { type: 'Lead', id: `${arg.id}-activities` },
        { type: 'Lead', id: arg.id },
        { type: 'Lead', id: 'ALL_FOLLOWUPS' },
      ],
    }),
    patchLeadFollowup: build.mutation({
      query: ({ id, followupId, ...body }) => ({ url: `/leads/${id}/followups/${followupId}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-followups` },
        { type: 'Lead', id: arg.id },
        { type: 'Lead', id: 'ALL_FOLLOWUPS' },
      ],
    }),
    deleteLeadFollowup: build.mutation({
      query: ({ id, followupId }) => ({ url: `/leads/${id}/followups/${followupId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-followups` },
        { type: 'Lead', id: arg.id },
        { type: 'Lead', id: 'ALL_FOLLOWUPS' },
      ],
    }),
    createLeadTaskComment: build.mutation({
      query: ({ id, taskId, body: text, isInternal }) => ({
        url: `/leads/${id}/tasks/${taskId}/comments`,
        method: 'POST',
        body: { body: text, isInternal: Boolean(isInternal) },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Lead', id: `${arg.id}-tasks` },
        { type: 'Lead', id: arg.id },
        { type: 'Task', id: `TIMELINE-${arg.taskId}` },
      ],
    }),
    getSavedViews: build.query({
      query: () => '/leads/saved-views',
      providesTags: [{ type: 'Lead', id: 'SAVED_VIEWS' }],
    }),
    createSavedView: build.mutation({
      query: (body) => ({ url: '/leads/saved-views', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'SAVED_VIEWS' }],
    }),
    deleteSavedView: build.mutation({
      query: (id) => ({ url: `/leads/saved-views/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'SAVED_VIEWS' }],
    }),
    getCustomFields: build.query({
      query: () => '/leads/custom-fields',
      providesTags: [{ type: 'Lead', id: 'CUSTOM_FIELDS' }],
    }),
    createCustomField: build.mutation({
      query: (body) => ({ url: '/leads/custom-fields', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Lead', id: 'CUSTOM_FIELDS' },
        { type: 'Lead', id: 'FORM_META' },
      ],
    }),
    patchCustomField: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/custom-fields/${id}`, method: 'PATCH', body }),
      invalidatesTags: [
        { type: 'Lead', id: 'CUSTOM_FIELDS' },
        { type: 'Lead', id: 'FORM_META' },
      ],
    }),
    deleteCustomField: build.mutation({
      query: (id) => ({ url: `/leads/custom-fields/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Lead', id: 'CUSTOM_FIELDS' },
        { type: 'Lead', id: 'FORM_META' },
      ],
    }),
    reorderCustomFields: build.mutation({
      query: (body) => ({ url: '/leads/custom-fields/reorder', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Lead', id: 'CUSTOM_FIELDS' },
        { type: 'Lead', id: 'FORM_META' },
      ],
    }),
    getAssignmentRules: build.query({
      query: () => '/leads/assignment-rules',
      providesTags: [{ type: 'Lead', id: 'ASSIGNMENT_RULES' }],
    }),
    createAssignmentRule: build.mutation({
      query: (body) => ({ url: '/leads/assignment-rules', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'ASSIGNMENT_RULES' }],
    }),
    patchAssignmentRule: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leads/assignment-rules/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'ASSIGNMENT_RULES' }],
    }),
    deleteAssignmentRule: build.mutation({
      query: (id) => ({ url: `/leads/assignment-rules/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'ASSIGNMENT_RULES' }],
    }),
    importLeads: build.mutation({
      query: (rows) => ({ url: '/leads/import', method: 'POST', body: { rows } }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }],
    }),
    exportLeads: build.mutation({
      query: (body) => ({ url: '/leads/export', method: 'POST', body }),
    }),
    getArchivedLeads: build.query({
      query: (params) => ({ url: '/leads/archived', params }),
      providesTags: [{ type: 'Lead', id: 'ARCHIVED_LIST' }],
    }),
    restoreLead: build.mutation({
      query: (id) => ({ url: `/leads/${id}/restore`, method: 'POST' }),
      invalidatesTags: [{ type: 'Lead', id: 'ARCHIVED_LIST' }, { type: 'Lead', id: 'LIST' }],
    }),
    deleteLeadPermanently: build.mutation({
      query: (id) => ({ url: `/leads/${id}/permanent`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'ARCHIVED_LIST' }],
    }),
    bulkArchivedLeads: build.mutation({
      query: (body) => ({ url: '/leads/archived/bulk', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'ARCHIVED_LIST' }, { type: 'Lead', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetLeadsQuery,
  useLazyGetLeadsQuery,
  useLazyGetLeadIdsQuery,
  useGetLeadQuery,
  useGetLeadFormMetaQuery,
  useGetLeadSetupQuery,
  useCreateLeadSourceMutation,
  useUpdateLeadSourceMutation,
  useDeleteLeadSourceMutation,
  useCreateLeadTagMutation,
  useUpdateLeadTagMutation,
  useDeleteLeadTagMutation,
  useCreatePipelineStatusMutation,
  useUpdatePipelineStatusMutation,
  useDeletePipelineStatusMutation,
  useReorderPipelineStatusesMutation,
  useCreateDealStatusMutation,
  useUpdateDealStatusMutation,
  useDeleteDealStatusMutation,
  useReorderDealStatusesMutation,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  usePatchLeadStatusMutation,
  useDeleteLeadMutation,
  useBulkLeadsMutation,
  useResolveLeadsByIdsMutation,
  useDistributeLeadsRoundRobinMutation,
  useGetLeadActivitiesQuery,
  useGetGoogleEmailStatusQuery,
  useGetGoogleEmailConnectUrlMutation,
  useCompleteGoogleEmailConnectQuery,
  useGetLeadEmailsQuery,
  useGetLeadEmailThreadsQuery,
  useGetLeadEmailThreadQuery,
  useSendLeadEmailMutation,
  useSyncLeadEmailsMutation,
  useGetLeadNotesQuery,
  useCreateLeadNoteMutation,
  usePatchLeadNoteMutation,
  useDeleteLeadNoteMutation,
  useGetLeadFilesQuery,
  useCreateLeadActivityMutation,
  usePatchLeadActivityMutation,
  useDeleteLeadActivityMutation,
  useGetLeadTasksQuery,
  useCreateLeadTaskMutation,
  usePatchLeadTaskMutation,
  useDeleteLeadTaskMutation,
  useGetLeadTaskTimelineQuery,
  useGetLeadFollowupsQuery,
  useGetAllFollowupsQuery,
  useCreateLeadFollowupMutation,
  usePatchLeadFollowupMutation,
  useDeleteLeadFollowupMutation,
  useCreateLeadTaskCommentMutation,
  useGetSavedViewsQuery,
  useCreateSavedViewMutation,
  useDeleteSavedViewMutation,
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  usePatchCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useReorderCustomFieldsMutation,
  useGetAssignmentRulesQuery,
  useCreateAssignmentRuleMutation,
  usePatchAssignmentRuleMutation,
  useDeleteAssignmentRuleMutation,
  useImportLeadsMutation,
  useExportLeadsMutation,
  useGetArchivedLeadsQuery,
  useRestoreLeadMutation,
  useDeleteLeadPermanentlyMutation,
  useBulkArchivedLeadsMutation,
} = leadsApi
