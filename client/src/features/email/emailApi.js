import { baseApi } from '@/features/api/baseApi'

export const emailApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEmailThreads: build.query({
      query: (params) => ({ url: '/email/threads', params }),
      providesTags: [{ type: 'Email', id: 'THREADS' }],
    }),
    getEmailThread: build.query({
      query: ({ threadId }) => `/email/threads/${threadId}`,
      providesTags: (_r, _e, arg) => [{ type: 'Email', id: `THREAD-${arg.threadId}` }],
    }),
    syncEmailReplies: build.mutation({
      query: () => ({ url: '/email/sync', method: 'POST' }),
      invalidatesTags: [{ type: 'Email', id: 'THREADS' }],
    }),
    uploadEmailAttachments: build.mutation({
      query: (files) => {
        const body = new FormData()
        for (const file of files || []) body.append('files', file)
        return {
          url: '/email/attachments',
          method: 'POST',
          body,
        }
      },
    }),
    sendEmailForLead: build.mutation({
      query: ({ leadId, ...body }) => ({ url: `/leads/${leadId}/emails/send`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Email', id: 'THREADS' },
        { type: 'Email', id: `THREAD-${arg.threadId || 'any'}` },
        { type: 'Lead', id: `${arg.leadId}-emails` },
        { type: 'Lead', id: `${arg.leadId}-email-threads` },
        { type: 'Lead', id: `${arg.leadId}-activities` },
      ],
    }),
  }),
})

export const {
  useGetEmailThreadsQuery,
  useGetEmailThreadQuery,
  useSyncEmailRepliesMutation,
  useUploadEmailAttachmentsMutation,
  useSendEmailForLeadMutation,
} = emailApi
