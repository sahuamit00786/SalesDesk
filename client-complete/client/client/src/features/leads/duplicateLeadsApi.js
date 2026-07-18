import { baseApi } from '@/features/api/baseApi'

export const duplicateLeadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDuplicateLeads: build.query({
      query: (params) => ({ url: '/leads/duplicates', params }),
      providesTags: [{ type: 'Lead', id: 'DUPLICATES' }],
    }),
    deleteDuplicateLead: build.mutation({
      query: (id) => ({ url: `/leads/duplicates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'DUPLICATES' }],
    }),
    createDuplicateAsLead: build.mutation({
      query: (id) => ({ url: `/leads/duplicates/${id}/create`, method: 'POST' }),
      invalidatesTags: [{ type: 'Lead', id: 'DUPLICATES' }, { type: 'Lead', id: 'LIST' }],
    }),
    mergeDuplicateLead: build.mutation({
      query: ({ id, fieldSelections }) => ({
        url: `/leads/duplicates/${id}/merge`,
        method: 'POST',
        body: { fieldSelections },
      }),
      invalidatesTags: [{ type: 'Lead', id: 'DUPLICATES' }, { type: 'Lead', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetDuplicateLeadsQuery,
  useDeleteDuplicateLeadMutation,
  useCreateDuplicateAsLeadMutation,
  useMergeDuplicateLeadMutation,
} = duplicateLeadsApi
