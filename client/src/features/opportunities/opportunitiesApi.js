import { baseApi } from '@/features/api/baseApi'

export const opportunitiesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOpportunities: build.query({
      query: (params) => ({ url: '/opportunities', params }),
      providesTags: [{ type: 'Opportunity', id: 'LIST' }],
    }),
    getOpportunity: build.query({
      query: (id) => `/opportunities/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Opportunity', id }],
    }),
    createOpportunity: build.mutation({
      query: (body) => ({ url: '/opportunities', method: 'POST', body }),
      invalidatesTags: [{ type: 'Opportunity', id: 'LIST' }],
    }),
    updateOpportunity: build.mutation({
      query: ({ id, ...body }) => ({ url: `/opportunities/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Opportunity', id: 'LIST' }, { type: 'Opportunity', id: arg.id }],
    }),
    patchOpportunityStage: build.mutation({
      query: ({ id, currentStage }) => ({ url: `/opportunities/${id}/stage`, method: 'PATCH', body: { currentStage } }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Opportunity', id: 'LIST' }, { type: 'Opportunity', id: arg.id }],
    }),
  }),
})

export const {
  useGetOpportunitiesQuery,
  useGetOpportunityQuery,
  useCreateOpportunityMutation,
  useUpdateOpportunityMutation,
  usePatchOpportunityStageMutation,
} = opportunitiesApi

