import { baseApi } from '@/features/api/baseApi'

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLeads: build.query({
      query: (params) => ({
        url: '/leads',
        params,
      }),
      providesTags: [{ type: 'Lead', id: 'LIST' }],
    }),
    getLead: build.query({
      query: (id) => `/leads/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id }],
    }),
  }),
})

export const { useGetLeadsQuery, useGetLeadQuery } = leadsApi
