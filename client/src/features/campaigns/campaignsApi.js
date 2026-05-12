import { baseApi } from '@/features/api/baseApi'
import toast from 'react-hot-toast'

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCampaigns: build.query({
      query: (params = {}) => ({ url: '/campaigns', params }),
      providesTags: (_r, _e, arg) => [{ type: 'Campaign', id: `LIST-${arg?.status || 'all'}` }, { type: 'Campaign', id: 'LIST' }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
        } catch {
          toast.error('Could not load campaigns.')
        }
      },
    }),
    getCampaign: build.query({
      query: (id) => `/campaigns/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Campaign', id }],
    }),
    getCampaignLeads: build.query({
      query: ({ campaignId, ...params }) => ({
        url: `/campaigns/${campaignId}/leads`,
        params,
      }),
      providesTags: (_r, _e, arg) => [{ type: 'Campaign', id: `${arg.campaignId}-leads` }],
    }),
    createCampaign: build.mutation({
      query: (body) => ({ url: '/campaigns', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Campaign', id: 'LIST' },
        { type: 'Lead', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          toast.success('Campaign created.')
        } catch {
          toast.error('Could not create campaign.')
        }
      },
    }),
    patchCampaign: build.mutation({
      query: ({ id, ...body }) => ({ url: `/campaigns/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: 'LIST' },
        { type: 'Campaign', id: arg.id },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          toast.success('Campaign updated.')
        } catch {
          toast.error('Could not update campaign.')
        }
      },
    }),
    patchCampaignLeadStage: build.mutation({
      query: ({ campaignId, leadId, stageKey }) => ({
        url: `/campaigns/${campaignId}/leads/${leadId}/stage`,
        method: 'PATCH',
        body: { stageKey },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
        { type: 'Campaign', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
        } catch {
          toast.error('Could not update stage.')
        }
      },
    }),
  }),
})

export const {
  useListCampaignsQuery,
  useGetCampaignQuery,
  useGetCampaignLeadsQuery,
  useCreateCampaignMutation,
  usePatchCampaignMutation,
  usePatchCampaignLeadStageMutation,
} = campaignsApi
