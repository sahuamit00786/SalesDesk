import { baseApi } from '@/features/api/baseApi'

export const salesDocTemplatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSalesDocTemplates: build.query({
      query: (params) => ({ url: '/sales-docs/templates', params }),
      providesTags: [{ type: 'SalesDocTemplate', id: 'LIST' }],
    }),
    getSalesDocTemplate: build.query({
      query: (id) => `/sales-docs/templates/${encodeURIComponent(id)}`,
      /** Avoid duplicate cache entries when the same UUID appears with different casing. */
      serializeQueryArgs: ({ queryArgs }) => String(queryArgs || '').toLowerCase(),
      providesTags: (_r, _e, id) => [{ type: 'SalesDocTemplate', id: String(id || '').toLowerCase() }],
      refetchOnMountOrArgChange: true,
    }),
    createSalesDocTemplate: build.mutation({
      query: (body) => ({ url: '/sales-docs/templates', method: 'POST', body }),
      invalidatesTags: [{ type: 'SalesDocTemplate', id: 'LIST' }],
    }),
    patchSalesDocTemplate: build.mutation({
      query: ({ id, ...body }) => ({ url: `/sales-docs/templates/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'SalesDocTemplate', id: arg.id }, { type: 'SalesDocTemplate', id: 'LIST' }],
    }),
    deleteSalesDocTemplate: build.mutation({
      query: (id) => ({ url: `/sales-docs/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'SalesDocTemplate', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetSalesDocTemplatesQuery,
  useGetSalesDocTemplateQuery,
  useCreateSalesDocTemplateMutation,
  usePatchSalesDocTemplateMutation,
  useDeleteSalesDocTemplateMutation,
} = salesDocTemplatesApi
