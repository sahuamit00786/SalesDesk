import { baseApi } from '@/features/api/baseApi'

export const dealPaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listDealPayments: build.query({
      query: ({ dealId, ...params }) => ({ url: `/deals/${dealId}/payments`, params }),
      providesTags: (_r, _e, arg) => [{ type: 'DealPayment', id: `${arg.dealId}-LIST` }],
    }),
    listAllPayments: build.query({
      query: (params) => ({ url: '/deals/payments', params }),
      providesTags: [{ type: 'DealPayment', id: 'ALL-LIST' }],
    }),
    createDealPayment: build.mutation({
      query: ({ dealId, ...body }) => ({ url: `/deals/${dealId}/payments`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'DealPayment', id: `${arg.dealId}-LIST` },
        { type: 'DealPayment', id: 'ALL-LIST' },
        { type: 'DealActivity', id: `${arg.dealId}-LIST` },
      ],
    }),
    patchDealPayment: build.mutation({
      query: ({ dealId, paymentId, ...body }) => ({
        url: `/deals/${dealId}/payments/${paymentId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'DealPayment', id: `${arg.dealId}-LIST` },
        { type: 'DealPayment', id: 'ALL-LIST' },
      ],
    }),
    deleteDealPayment: build.mutation({
      query: ({ dealId, paymentId }) => ({
        url: `/deals/${dealId}/payments/${paymentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'DealPayment', id: `${arg.dealId}-LIST` },
        { type: 'DealPayment', id: 'ALL-LIST' },
        { type: 'DealActivity', id: `${arg.dealId}-LIST` },
      ],
    }),
  }),
})

export const {
  useListDealPaymentsQuery,
  useListAllPaymentsQuery,
  useCreateDealPaymentMutation,
  usePatchDealPaymentMutation,
  useDeleteDealPaymentMutation,
} = dealPaymentsApi
