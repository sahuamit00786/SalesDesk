import { baseApi } from '@/features/api/baseApi'

export const emailApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMailboxInboxBadge: build.query({
      query: () => '/email/mailbox-badge',
      providesTags: [{ type: 'Email', id: 'MAILBOX_BADGE' }],
    }),
    getMailboxThreads: build.query({
      query: (params) => ({ url: '/email/mailbox-threads', params }),
      providesTags: [{ type: 'Email', id: 'MAILBOX_THREADS' }],
    }),
    getMailboxThread: build.query({
      query: (threadId) => ({
        url: `/email/mailbox-threads/${encodeURIComponent(threadId)}`,
      }),
      providesTags: (_r, _e, threadId) => [{ type: 'Email', id: `MAILBOX-${threadId}` }],
    }),
    markMailboxThreadRead: build.mutation({
      query: (threadId) => ({
        url: `/email/mailbox-threads/${encodeURIComponent(threadId)}/read`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, threadId) => [
        { type: 'Email', id: 'MAILBOX_THREADS' },
        { type: 'Email', id: 'MAILBOX_BADGE' },
        { type: 'Email', id: `MAILBOX-${threadId}` },
      ],
    }),
    saveMailboxAttachmentToLead: build.mutation({
      query: (body) => ({ url: '/email/mailbox-save-attachment', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Email', id: 'MAILBOX_BADGE' },
        { type: 'Document', id: 'LIST' },
        { type: 'Document', id: 'FOLDER_TREE' },
        { type: 'Document', id: 'LEAD_SUMMARIES' },
      ],
    }),
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
      invalidatesTags: [
        { type: 'Email', id: 'THREADS' },
        { type: 'Email', id: 'MAILBOX_THREADS' },
        { type: 'Email', id: 'MAILBOX_BADGE' },
      ],
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
        { type: 'Email', id: 'MAILBOX_THREADS' },
        { type: 'Email', id: 'MAILBOX_BADGE' },
        { type: 'Email', id: `THREAD-${arg.threadId || 'any'}` },
        { type: 'Lead', id: `${arg.leadId}-emails` },
        { type: 'Lead', id: `${arg.leadId}-email-threads` },
        { type: 'Lead', id: `${arg.leadId}-activities` },
      ],
    }),
    getEmailTrackingReport: build.query({
      query: (params = {}) => ({ url: '/email/tracking/reports', params }),
      providesTags: [{ type: 'Email', id: 'TRACKING_REPORT' }],
    }),
  }),
})

export const {
  useGetMailboxInboxBadgeQuery,
  useGetMailboxThreadsQuery,
  useGetMailboxThreadQuery,
  useMarkMailboxThreadReadMutation,
  useSaveMailboxAttachmentToLeadMutation,
  useGetEmailThreadsQuery,
  useGetEmailThreadQuery,
  useSyncEmailRepliesMutation,
  useUploadEmailAttachmentsMutation,
  useSendEmailForLeadMutation,
  useGetEmailTrackingReportQuery,
} = emailApi
