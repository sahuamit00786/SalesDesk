import { baseApi } from '@/features/api/baseApi'
import toast from 'react-hot-toast'

export const workflowsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listWorkflows: build.query({
      query: () => '/workflows',
      providesTags: [{ type: 'Workflow', id: 'LIST' }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
        } catch (err) {
          toast.error(err?.error?.data?.error?.message || 'Could not load workflows.')
        }
      },
    }),
    getWorkflow: build.query({
      query: (id) => `/workflows/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Workflow', id }],
    }),
    createWorkflow: build.mutation({
      query: (body) => ({ url: '/workflows', method: 'POST', body }),
      invalidatesTags: [{ type: 'Workflow', id: 'LIST' }],
    }),
    patchWorkflow: build.mutation({
      query: ({ id, ...body }) => ({ url: `/workflows/${id}`, method: 'PATCH', body }),
      invalidatesTags: () => [{ type: 'Workflow', id: 'LIST' }],
    }),
    deleteWorkflow: build.mutation({
      query: (id) => ({ url: `/workflows/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Workflow', id: 'LIST' }],
    }),
    publishWorkflow: build.mutation({
      query: (id) => ({ url: `/workflows/${id}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Workflow', id }, { type: 'Workflow', id: 'LIST' }],
    }),
    testWorkflow: build.mutation({
      query: ({ id, leadId }) => ({ url: `/workflows/${id}/test`, method: 'POST', body: { leadId } }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Workflow', id: arg.id },
        { type: 'WorkflowRun', id: `LIST-${arg.id}` },
      ],
    }),
    listWorkflowRuns: build.query({
      query: (id) => `/workflows/${id}/runs`,
      providesTags: (_r, _e, id) => [{ type: 'WorkflowRun', id: `LIST-${id}` }],
    }),
    getWorkflowRun: build.query({
      query: (runId) => `/workflow-runs/${runId}`,
      providesTags: (_r, _e, runId) => [{ type: 'WorkflowRun', id: runId }],
    }),
  }),
})

export const {
  useListWorkflowsQuery,
  useGetWorkflowQuery,
  useCreateWorkflowMutation,
  usePatchWorkflowMutation,
  useDeleteWorkflowMutation,
  usePublishWorkflowMutation,
  useTestWorkflowMutation,
  useListWorkflowRunsQuery,
  useGetWorkflowRunQuery,
} = workflowsApi
