import { baseApi } from '@/features/api/baseApi'

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardStats: build.query({
      query: () => '/analytics/dashboard',
      providesTags: [{ type: 'Analytics', id: 'DASHBOARD' }],
    }),
  }),
})

export const { useGetDashboardStatsQuery } = analyticsApi
