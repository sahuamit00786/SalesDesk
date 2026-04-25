import { baseApi } from '@/features/api/baseApi'

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTasks: build.query({
      query: (params) => ({ url: '/tasks', params }),
      providesTags: [{ type: 'Task', id: 'LIST' }],
    }),
  }),
})

export const { useGetTasksQuery } = tasksApi
