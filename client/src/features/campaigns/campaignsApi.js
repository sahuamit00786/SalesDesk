import { baseApi } from '@/features/api/baseApi'
import toast from 'react-hot-toast'

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCampaigns: build.query({
      query: (params = {}) => ({ url: '/campaigns', params }),
      providesTags: (_r, _e, arg) => [{ type: 'Campaign', id: `LIST-${arg?.status || 'all'}` }, { type: 'Campaign', id: 'LIST' }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled } catch { toast.error('Could not load campaigns.') }
      },
    }),
    getCampaign: build.query({
      query: (id) => `/campaigns/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Campaign', id }],
    }),
    getCampaignLeads: build.query({
      query: ({ campaignId, ...params }) => ({ url: `/campaigns/${campaignId}/leads`, params }),
      providesTags: (_r, _e, arg) => [{ type: 'Campaign', id: `${arg.campaignId}-leads` }],
    }),
    createCampaign: build.mutation({
      query: (body) => ({ url: '/campaigns', method: 'POST', body }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }, { type: 'Lead', id: 'LIST' }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled; toast.success('Campaign created.') } catch { toast.error('Could not create campaign.') }
      },
    }),
    patchCampaign: build.mutation({
      query: ({ id, ...body }) => ({ url: `/campaigns/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Campaign', id: 'LIST' }, { type: 'Campaign', id: arg.id }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled; toast.success('Campaign updated.') } catch { toast.error('Could not update campaign.') }
      },
    }),
    patchCampaignLeadAmount: build.mutation({
      query: ({ campaignId, leadId, amountReceived }) => ({
        url: `/campaigns/${campaignId}/leads/${leadId}`,
        method: 'PATCH',
        body: { amountReceived },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
        { type: 'Campaign', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled } catch { toast.error('Could not update amount received.') }
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
        try { await queryFulfilled } catch { toast.error('Could not update stage.') }
      },
    }),
    addCampaignLeads: build.mutation({
      query: ({ campaignId, ...body }) => ({ url: `/campaigns/${campaignId}/leads`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
        { type: 'Campaign', id: 'LIST' },
      ],
    }),
    removeCampaignLead: build.mutation({
      query: ({ campaignId, leadId }) => ({ url: `/campaigns/${campaignId}/leads/${leadId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
        { type: 'Campaign', id: 'LIST' },
      ],
    }),
    addCampaignMembers: build.mutation({
      query: ({ campaignId, userIds }) => ({ url: `/campaigns/${campaignId}/members`, method: 'POST', body: { userIds } }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Campaign', id: arg.campaignId }, { type: 'Campaign', id: 'LIST' }],
    }),
    removeCampaignMember: build.mutation({
      query: ({ campaignId, userId }) => ({ url: `/campaigns/${campaignId}/members/${userId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Campaign', id: arg.campaignId }, { type: 'Campaign', id: 'LIST' }],
    }),
    distributeCampaignLeads: build.mutation({
      query: ({ campaignId, ...body }) => ({ url: `/campaigns/${campaignId}/distribute`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
      ],
    }),

    getCampaignReport: build.query({
      query: ({ id, ...params }) => ({ url: `/campaigns/${id}/report`, params }),
      providesTags: (_r, _e, arg) => [{ type: 'Campaign', id: `${arg.id}-report` }],
    }),

    // Campaign Payments
    getCampaignLeadPayments: build.query({
      query: ({ campaignId, leadId }) => `/campaigns/${campaignId}/leads/${leadId}/payments`,
      providesTags: (_r, _e, arg) => [{ type: 'Campaign', id: `${arg.campaignId}-${arg.leadId}-payments` }],
    }),
    createCampaignPayment: build.mutation({
      query: ({ campaignId, leadId, ...body }) => ({
        url: `/campaigns/${campaignId}/leads/${leadId}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
        { type: 'Campaign', id: `${arg.campaignId}-${arg.leadId}-payments` },
        { type: 'Campaign', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled; toast.success('Payment recorded.') } catch { toast.error('Could not record payment.') }
      },
    }),
    patchCampaignPayment: build.mutation({
      query: ({ campaignId, leadId, paymentId, ...body }) => ({
        url: `/campaigns/${campaignId}/leads/${leadId}/payments/${paymentId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
        { type: 'Campaign', id: `${arg.campaignId}-${arg.leadId}-payments` },
        { type: 'Campaign', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled; toast.success('Payment updated.') } catch { toast.error('Could not update payment.') }
      },
    }),
    deleteCampaignPayment: build.mutation({
      query: ({ campaignId, leadId, paymentId }) => ({
        url: `/campaigns/${campaignId}/leads/${leadId}/payments/${paymentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Campaign', id: arg.campaignId },
        { type: 'Campaign', id: `${arg.campaignId}-leads` },
        { type: 'Campaign', id: `${arg.campaignId}-${arg.leadId}-payments` },
        { type: 'Campaign', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try { await queryFulfilled; toast.success('Payment deleted.') } catch { toast.error('Could not delete payment.') }
      },
    }),
  }),
})

export const {
  useGetCampaignReportQuery,
  useListCampaignsQuery,
  useGetCampaignQuery,
  useGetCampaignLeadsQuery,
  useCreateCampaignMutation,
  usePatchCampaignMutation,
  usePatchCampaignLeadAmountMutation,
  usePatchCampaignLeadStageMutation,
  useAddCampaignLeadsMutation,
  useRemoveCampaignLeadMutation,
  useAddCampaignMembersMutation,
  useRemoveCampaignMemberMutation,
  useDistributeCampaignLeadsMutation,
  useGetCampaignLeadPaymentsQuery,
  useCreateCampaignPaymentMutation,
  usePatchCampaignPaymentMutation,
  useDeleteCampaignPaymentMutation,
} = campaignsApi
