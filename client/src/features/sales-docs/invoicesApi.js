import { baseApi } from '@/features/api/baseApi'

export const invoicesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInvoices: build.query({
      query: (params) => ({ url: '/invoices', params }),
      providesTags: [{ type: 'Invoice', id: 'LIST' }],
    }),
    getInvoice: build.query({
      query: (id) => `/invoices/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Invoice', id }],
    }),
    createInvoice: build.mutation({
      query: (body) => ({ url: '/invoices', method: 'POST', body }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }],
    }),
    patchInvoice: build.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Invoice', id: arg.id }, { type: 'Invoice', id: 'LIST' }],
    }),
    deleteInvoice: build.mutation({
      query: (id) => ({ url: `/invoices/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }, { type: 'Quotation', id: 'LIST' }, 'DealPayment'],
    }),
    recordInvoicePayment: build.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/payments`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Invoice', id: arg.id }, { type: 'Invoice', id: 'LIST' }, 'DealPayment'],
    }),
    deleteInvoicePayment: build.mutation({
      query: ({ id, paymentId }) => ({ url: `/invoices/${id}/payments/${paymentId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Invoice', id: arg.id }, { type: 'Invoice', id: 'LIST' }, 'DealPayment'],
    }),
  }),
})

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  usePatchInvoiceMutation,
  useDeleteInvoiceMutation,
  useRecordInvoicePaymentMutation,
  useDeleteInvoicePaymentMutation,
} = invoicesApi
