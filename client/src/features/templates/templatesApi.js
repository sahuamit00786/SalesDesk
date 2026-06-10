import { baseApi } from '@/features/api/baseApi'

export const templatesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTemplates: build.query({
      query: (params) => ({ url: '/templates', params }),
      providesTags: [{ type: 'Template', id: 'LIST' }],
    }),
    getTemplate: build.query({
      query: (id) => `/templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Template', id }],
    }),
    createTemplate: build.mutation({
      query: (body) => ({ url: '/templates', method: 'POST', body }),
      invalidatesTags: [{ type: 'Template', id: 'LIST' }],
    }),
    updateTemplate: build.mutation({
      query: ({ id, ...body }) => ({ url: `/templates/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Template', id: arg.id }, { type: 'Template', id: 'LIST' }],
    }),
    archiveTemplate: build.mutation({
      query: (id) => ({ url: `/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Template', id: 'LIST' }],
    }),
    previewTemplateSend: build.mutation({
      query: ({ id, leadIds }) => ({ url: `/templates/${id}/preview-send`, method: 'POST', body: { leadIds } }),
    }),
    generateTemplateContent: build.mutation({
      query: (body) => ({ url: '/templates/generate-content', method: 'POST', body }),
    }),
    sendTemplate: build.mutation({
      query: ({ id, leadIds }) => ({ url: `/templates/${id}/send`, method: 'POST', body: { leadIds, confirmed: true } }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'TemplateHistory', id: arg.id },
        { type: 'Template', id: 'LIST' },
        { type: 'Lead', id: 'LIST' },
      ],
    }),
    getTemplateSendHistory: build.query({
      query: ({ id, ...params }) => ({ url: `/templates/${id}/send-history`, params }),
      providesTags: (_result, _error, arg) => [{ type: 'TemplateHistory', id: arg.id }],
    }),
    getLeadEmailHistory: build.query({
      query: (leadId) => `/leads/${leadId}/email-history`,
      providesTags: (_result, _error, leadId) => [{ type: 'TemplateHistory', id: `lead-${leadId}` }],
    }),
  }),
})

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useArchiveTemplateMutation,
  usePreviewTemplateSendMutation,
  useGenerateTemplateContentMutation,
  useSendTemplateMutation,
  useGetTemplateSendHistoryQuery,
  useGetLeadEmailHistoryQuery,
} = templatesApi
