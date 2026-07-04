import { baseApi } from '@/features/api/baseApi'

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTasks: build.query({
      query: (params) => ({ url: '/tasks', params }),
      providesTags: [{ type: 'Task', id: 'LIST' }],
    }),
    // Partial patch by task id alone (no leadId in the URL). `listArgs` must be the
    // exact current getTasks params object so the optimistic cache update hits the
    // active list entry; `leadId` is only used for tag invalidation.
    patchTaskById: build.mutation({
      query: ({ taskId, listArgs, leadId, ...body }) => ({ url: `/tasks/${taskId}`, method: 'PATCH', body }),
      async onQueryStarted({ taskId, listArgs, leadId, ...body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          tasksApi.util.updateQueryData('getTasks', listArgs, (draft) => {
            const row = Array.isArray(draft?.data) ? draft.data.find((t) => t.id === taskId) : null
            if (row) Object.assign(row, body)
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      // Keep Task LIST invalidation: recurring tasks spawn a next occurrence on
      // completion and the server hides stale completed tasks — refetch reconciles.
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Task', id: 'LIST' },
        ...(arg.leadId
          ? [
              { type: 'Lead', id: `${arg.leadId}-tasks` },
              { type: 'Lead', id: `${arg.leadId}-activities` },
              { type: 'Lead', id: arg.leadId },
            ]
          : []),
      ],
    }),
  }),
})

export const { useGetTasksQuery, usePatchTaskByIdMutation } = tasksApi
