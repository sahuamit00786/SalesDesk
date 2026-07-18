import { baseApi } from '@/features/api/baseApi'

export const quotationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getQuotations: build.query({
      query: (params) => ({ url: '/quotations', params }),
      providesTags: [{ type: 'Quotation', id: 'LIST' }],
    }),
    getQuotation: build.query({
      query: (id) => `/quotations/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Quotation', id }],
    }),
    createQuotation: build.mutation({
      query: (body) => ({ url: '/quotations', method: 'POST', body }),
      invalidatesTags: [{ type: 'Quotation', id: 'LIST' }],
    }),
    patchQuotation: build.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Quotation', id: arg.id }, { type: 'Quotation', id: 'LIST' }],
    }),
    deleteQuotation: build.mutation({
      query: (id) => ({ url: `/quotations/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Quotation', id: 'LIST' }, { type: 'Invoice', id: 'LIST' }],
    }),
    convertQuotationToInvoice: build.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/${id}/convert-to-invoice`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Quotation', id: 'LIST' },
        { type: 'Invoice', id: 'LIST' },
        { type: 'Quotation', id: arg.id },
      ],
    }),
  }),
})

export const {
  useGetQuotationsQuery,
  useGetQuotationQuery,
  useCreateQuotationMutation,
  usePatchQuotationMutation,
  useDeleteQuotationMutation,
  useConvertQuotationToInvoiceMutation,
} = quotationsApi
