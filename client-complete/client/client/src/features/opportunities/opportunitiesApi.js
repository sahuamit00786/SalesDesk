import { baseApi } from '@/features/api/baseApi'

/** Mutations still use /opportunities/* routes; list data is GET /leads?isOpportunity=true (see PipelinePage). */
export const opportunitiesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createOpportunity: build.mutation({
      query: (body) => ({ url: '/opportunities', method: 'POST', body }),
      invalidatesTags: (result, _e, arg) => {
        const tags = [{ type: 'Lead', id: 'LIST' }, { type: 'Analytics', id: 'NAV_BADGES' }]
        const newId = result?.data?.id
        const leadId = arg?.leadId ?? result?.data?.leadId
        if (newId) tags.push({ type: 'Lead', id: newId })
        if (leadId) {
          tags.push({ type: 'Lead', id: leadId }, { type: 'Lead', id: `${leadId}-activities` })
        }
        return tags
      },
    }),
    updateOpportunity: build.mutation({
      query: ({ id, ...body }) => ({ url: `/opportunities/${id}`, method: 'PUT', body }),
      invalidatesTags: (result, _e, arg) => {
        const tags = [{ type: 'Lead', id: 'LIST' }, { type: 'Lead', id: arg.id }]
        const leadId = result?.data?.leadId
        if (leadId) tags.push({ type: 'Lead', id: leadId }, { type: 'Lead', id: `${leadId}-activities` })
        return tags
      },
    }),
    patchPipelineStatus: build.mutation({
      query: ({ id, pipelineStatusId }) => ({ url: `/opportunities/${id}/status`, method: 'PATCH', body: { pipelineStatusId } }),
      invalidatesTags: (result, _e, arg) => {
        const tags = [{ type: 'Lead', id: 'LIST' }, { type: 'Lead', id: arg.id }]
        const leadId = result?.data?.leadId
        if (leadId) tags.push({ type: 'Lead', id: leadId }, { type: 'Lead', id: `${leadId}-activities` })
        return tags
      },
    }),
    revertOpportunityToLead: build.mutation({
      query: ({ id }) => ({ url: `/opportunities/${id}/revert-to-lead`, method: 'PATCH' }),
      invalidatesTags: (result, _e, arg) => {
        const tags = [{ type: 'Lead', id: 'LIST' }, { type: 'Lead', id: arg.id }, { type: 'Analytics', id: 'NAV_BADGES' }]
        const leadId = result?.data?.leadId
        if (leadId) tags.push({ type: 'Lead', id: `${leadId}-activities` })
        return tags
      },
    }),
  }),
})

export const {
  useCreateOpportunityMutation,
  useUpdateOpportunityMutation,
  usePatchPipelineStatusMutation,
  useRevertOpportunityToLeadMutation,
} = opportunitiesApi
