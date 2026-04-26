import { baseApi } from '@/features/api/baseApi'

export const webFormsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWebForms: build.query({
      query: (search = '') => ({ url: '/forms', params: search ? { search } : undefined }),
      providesTags: [{ type: 'Lead', id: 'WEB_FORMS' }],
    }),
    getWebForm: build.query({
      query: (id) => `/forms/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Lead', id: `WEB_FORM_${id}` }],
    }),
    createWebForm: build.mutation({
      query: (body) => ({ url: '/forms', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'WEB_FORMS' }],
    }),
    updateWebForm: build.mutation({
      query: ({ id, ...body }) => ({ url: `/forms/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Lead', id: 'WEB_FORMS' }, { type: 'Lead', id: `WEB_FORM_${arg.id}` }],
    }),
    deleteWebForm: build.mutation({
      query: (id) => ({ url: `/forms/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'WEB_FORMS' }],
    }),
    generateWebFormEmailTemplate: build.mutation({
      query: (body) => ({ url: '/forms/generate-email-template', method: 'POST', body }),
    }),
    getWebFormEmailTemplates: build.query({
      query: () => '/forms/email-templates',
      providesTags: [{ type: 'Lead', id: 'WEB_FORM_EMAIL_TEMPLATES' }],
    }),
    createWebFormEmailTemplate: build.mutation({
      query: (body) => ({ url: '/forms/email-templates', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'WEB_FORM_EMAIL_TEMPLATES' }],
    }),
    updateWebFormEmailTemplate: build.mutation({
      query: ({ id, ...body }) => ({ url: `/forms/email-templates/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'WEB_FORM_EMAIL_TEMPLATES' }],
    }),
    deleteWebFormEmailTemplate: build.mutation({
      query: (id) => ({ url: `/forms/email-templates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'WEB_FORM_EMAIL_TEMPLATES' }],
    }),
  }),
})

export const {
  useGetWebFormsQuery,
  useGetWebFormQuery,
  useCreateWebFormMutation,
  useUpdateWebFormMutation,
  useDeleteWebFormMutation,
  useGenerateWebFormEmailTemplateMutation,
  useGetWebFormEmailTemplatesQuery,
  useCreateWebFormEmailTemplateMutation,
  useUpdateWebFormEmailTemplateMutation,
  useDeleteWebFormEmailTemplateMutation,
} = webFormsApi
