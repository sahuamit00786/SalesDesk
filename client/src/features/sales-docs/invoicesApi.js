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
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }, { type: 'Quotation', id: 'LIST' }],
    }),
    recordInvoicePayment: build.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/${id}/payments`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Invoice', id: arg.id }, { type: 'Invoice', id: 'LIST' }],
    }),
    deleteInvoicePayment: build.mutation({
      query: ({ id, paymentId }) => ({ url: `/invoices/${id}/payments/${paymentId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Invoice', id: arg.id }, { type: 'Invoice', id: 'LIST' }],
    }),
    getInvoiceTemplates: build.query({
      query: () => '/invoices/templates',
      providesTags: [{ type: 'InvoiceTemplate', id: 'LIST' }],
    }),
    getInvoiceTemplate: build.query({
      query: (id) => `/invoices/templates/${encodeURIComponent(id)}`,
      /** Avoid duplicate cache entries when the same UUID appears with different casing. */
      serializeQueryArgs: ({ queryArgs }) => String(queryArgs || '').toLowerCase(),
      providesTags: (_r, _e, id) => [{ type: 'InvoiceTemplate', id: String(id || '').toLowerCase() }],
      refetchOnMountOrArgChange: true,
    }),
    createInvoiceTemplate: build.mutation({
      query: (body) => ({ url: '/invoices/templates', method: 'POST', body }),
      invalidatesTags: [{ type: 'InvoiceTemplate', id: 'LIST' }],
    }),
    patchInvoiceTemplate: build.mutation({
      query: ({ id, ...body }) => ({ url: `/invoices/templates/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'InvoiceTemplate', id: arg.id }, { type: 'InvoiceTemplate', id: 'LIST' }],
    }),
    deleteInvoiceTemplate: build.mutation({
      query: (id) => ({ url: `/invoices/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'InvoiceTemplate', id: 'LIST' }],
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
  useGetInvoiceTemplatesQuery,
  useGetInvoiceTemplateQuery,
  useCreateInvoiceTemplateMutation,
  usePatchInvoiceTemplateMutation,
  useDeleteInvoiceTemplateMutation,
} = invoicesApi
