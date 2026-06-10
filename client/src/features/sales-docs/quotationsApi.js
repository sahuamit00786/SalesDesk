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
    getQuotationTemplates: build.query({
      query: () => '/quotations/templates',
      providesTags: [{ type: 'QuotationTemplate', id: 'LIST' }],
    }),
    getQuotationTemplate: build.query({
      query: (id) => `/quotations/templates/${encodeURIComponent(id)}`,
      serializeQueryArgs: ({ queryArgs }) => String(queryArgs || '').toLowerCase(),
      providesTags: (_r, _e, id) => [{ type: 'QuotationTemplate', id: String(id || '').toLowerCase() }],
      keepUnusedDataFor: 0,
      refetchOnMountOrArgChange: true,
    }),
    createQuotationTemplate: build.mutation({
      query: (body) => ({ url: '/quotations/templates', method: 'POST', body }),
      invalidatesTags: [{ type: 'QuotationTemplate', id: 'LIST' }],
    }),
    patchQuotationTemplate: build.mutation({
      query: ({ id, ...body }) => ({ url: `/quotations/templates/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'QuotationTemplate', id: arg.id }, { type: 'QuotationTemplate', id: 'LIST' }],
    }),
    deleteQuotationTemplate: build.mutation({
      query: (id) => ({ url: `/quotations/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'QuotationTemplate', id: 'LIST' }],
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
  useGetQuotationTemplatesQuery,
  useGetQuotationTemplateQuery,
  useCreateQuotationTemplateMutation,
  usePatchQuotationTemplateMutation,
  useDeleteQuotationTemplateMutation,
} = quotationsApi
