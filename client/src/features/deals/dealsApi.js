import { baseApi } from '@/features/api/baseApi'

export const dealsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDeals: build.query({
      query: (params) => ({ url: '/deals', params }),
      providesTags: (result) =>
        result?.data
          ? [...result.data.map((d) => ({ type: 'Deal', id: d.id })), { type: 'Deal', id: 'LIST' }]
          : [{ type: 'Deal', id: 'LIST' }],
    }),
    getDeal: build.query({
      query: (id) => ({ url: `/deals/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'Deal', id }],
    }),
    createDeal: build.mutation({
      query: (body) => ({ url: '/deals', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Deal', id: 'LIST' },
        { type: 'Lead', id: 'LIST' },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Invoice', id: 'LIST' },
      ],
    }),
    patchDealStage: build.mutation({
      query: ({ id, currentStage }) => ({ url: `/deals/${id}/stage`, method: 'PATCH', body: { currentStage } }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Deal', id: 'LIST' },
        { type: 'Deal', id: arg.id },
        { type: 'Lead', id: 'LIST' },
        { type: 'DealActivity', id: `${arg.id}-LIST` },
      ],
    }),
    patchDeal: build.mutation({
      query: ({ id, ...body }) => ({ url: `/deals/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Deal', id: 'LIST' },
        { type: 'Deal', id: arg.id },
      ],
    }),
    deleteDeal: build.mutation({
      query: (id) => ({ url: `/deals/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Deal', id: 'LIST' },
        { type: 'Deal', id },
      ],
    }),
    getDealActivities: build.query({
      query: ({ id, ...params }) => ({ url: `/deals/${id}/activities`, params }),
      providesTags: (_r, _e, arg) => [{ type: 'DealActivity', id: `${arg.id}-LIST` }],
    }),
    createDealActivity: build.mutation({
      query: ({ id, ...body }) => ({ url: `/deals/${id}/activities`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'DealActivity', id: `${arg.id}-LIST` }],
    }),
    getDealTasks: build.query({
      query: (id) => `/deals/${id}/tasks`,
      providesTags: (_r, _e, id) => [{ type: 'Deal', id: `${id}-tasks` }],
    }),
    createDealTask: build.mutation({
      query: ({ id, ...body }) => ({ url: `/deals/${id}/tasks`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Deal', id: `${arg.id}-tasks` },
        { type: 'DealActivity', id: `${arg.id}-LIST` },
        { type: 'Deal', id: arg.id },
        { type: 'Task', id: 'LIST' },
        'CalendarEvents',
        'CalendarToday',
      ],
    }),
    patchDealTask: build.mutation({
      query: ({ id, taskId, ...body }) => ({ url: `/deals/${id}/tasks/${taskId}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Deal', id: `${arg.id}-tasks` },
        { type: 'DealActivity', id: `${arg.id}-LIST` },
        { type: 'Deal', id: arg.id },
        { type: 'Task', id: 'LIST' },
        { type: 'Task', id: `TIMELINE-${arg.taskId}` },
        'CalendarEvents',
        'CalendarToday',
      ],
    }),
    deleteDealTask: build.mutation({
      query: ({ id, taskId }) => ({ url: `/deals/${id}/tasks/${taskId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Deal', id: `${arg.id}-tasks` },
        { type: 'DealActivity', id: `${arg.id}-LIST` },
        { type: 'Deal', id: arg.id },
        { type: 'Task', id: 'LIST' },
        'CalendarEvents',
        'CalendarToday',
      ],
    }),
    getDealTaskTimeline: build.query({
      query: ({ id, taskId }) => `/deals/${id}/tasks/${taskId}/timeline`,
      providesTags: (_r, _e, arg) => [{ type: 'Task', id: `TIMELINE-${arg.taskId}` }],
    }),
    createDealTaskComment: build.mutation({
      query: ({ id, taskId, body: text, isInternal }) => ({
        url: `/deals/${id}/tasks/${taskId}/comments`,
        method: 'POST',
        body: { body: text, isInternal: Boolean(isInternal) },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Deal', id: `${arg.id}-tasks` },
        { type: 'Deal', id: arg.id },
        { type: 'Task', id: `TIMELINE-${arg.taskId}` },
      ],
    }),
  }),
})

export const {
  useGetDealsQuery,
  useGetDealQuery,
  useCreateDealMutation,
  usePatchDealStageMutation,
  usePatchDealMutation,
  useDeleteDealMutation,
  useGetDealActivitiesQuery,
  useCreateDealActivityMutation,
  useGetDealTasksQuery,
  useCreateDealTaskMutation,
  usePatchDealTaskMutation,
  useDeleteDealTaskMutation,
  useGetDealTaskTimelineQuery,
  useCreateDealTaskCommentMutation,
} = dealsApi
