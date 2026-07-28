import { baseApi } from '@/features/api/baseApi'

export const whatsappApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWhatsAppSettings: build.query({
      query: () => '/whatsapp/settings',
      providesTags: [{ type: 'Whatsapp', id: 'SETTINGS' }],
    }),
    saveWhatsAppSettings: build.mutation({
      query: (body) => ({ url: '/whatsapp/settings', method: 'PUT', body }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'SETTINGS' }],
    }),
    regenerateWhatsAppVerifyToken: build.mutation({
      query: () => ({ url: '/whatsapp/settings/regenerate-token', method: 'POST' }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'SETTINGS' }],
    }),
    getWhatsAppUnreadBadge: build.query({
      query: () => '/whatsapp/unread-badge',
      providesTags: [{ type: 'Whatsapp', id: 'BADGE' }],
    }),
    getWhatsAppConversations: build.query({
      query: (params) => ({ url: '/whatsapp/conversations', params }),
      providesTags: [{ type: 'Whatsapp', id: 'CONV_LIST' }],
    }),
    createWhatsAppConversation: build.mutation({
      query: (body) => ({ url: '/whatsapp/conversations', method: 'POST', body }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'CONV_LIST' }],
    }),
    updateWhatsAppConversation: build.mutation({
      query: ({ id, ...body }) => ({ url: `/whatsapp/conversations/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'CONV_LIST' }],
    }),
    reorderWhatsAppPinnedChats: build.mutation({
      query: (orderedIds) => ({ url: '/whatsapp/conversations/reorder-pins', method: 'POST', body: { orderedIds } }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'CONV_LIST' }],
    }),
    deleteWhatsAppConversation: build.mutation({
      query: (id) => ({ url: `/whatsapp/conversations/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'CONV_LIST' }, { type: 'Whatsapp', id: 'BADGE' }],
    }),
    markWhatsAppConversationUnread: build.mutation({
      query: (id) => ({ url: `/whatsapp/conversations/${id}/unread`, method: 'POST' }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'CONV_LIST' }, { type: 'Whatsapp', id: 'BADGE' }],
    }),
    getWhatsAppMessages: build.query({
      query: ({ id, ...params }) => ({ url: `/whatsapp/conversations/${id}/messages`, params }),
      providesTags: (_r, _e, arg) => [{ type: 'Whatsapp', id: `MSGS-${arg.id}` }],
    }),
    searchWhatsAppMessages: build.query({
      query: ({ id, q }) => ({ url: `/whatsapp/conversations/${id}/messages/search`, params: { q } }),
    }),
    getWhatsAppStarredMessages: build.query({
      query: () => '/whatsapp/starred',
      providesTags: [{ type: 'Whatsapp', id: 'STARRED' }],
    }),
    markWhatsAppConversationRead: build.mutation({
      // keepalive lets this survive a page reload/unload right after opening a
      // conversation — without it, a fast reload can abort the request mid-flight,
      // leaving unreadCount stuck server-side so the same messages resurface as "new".
      query: (id) => ({ url: `/whatsapp/conversations/${id}/read`, method: 'POST', keepalive: true }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'CONV_LIST' }, { type: 'Whatsapp', id: 'BADGE' }],
    }),
    sendWhatsAppMessage: build.mutation({
      query: ({ id, ...body }) => ({ url: `/whatsapp/conversations/${id}/messages`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Whatsapp', id: `MSGS-${arg.id}` },
        { type: 'Whatsapp', id: 'CONV_LIST' },
      ],
    }),
    reactToWhatsAppMessage: build.mutation({
      query: ({ id, messageId, emoji }) => ({
        url: `/whatsapp/conversations/${id}/messages/${messageId}/react`,
        method: 'POST',
        body: { emoji },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Whatsapp', id: `MSGS-${arg.id}` }],
    }),
    starWhatsAppMessage: build.mutation({
      query: ({ id, messageId, starred }) => ({
        url: `/whatsapp/conversations/${id}/messages/${messageId}/star`,
        method: 'POST',
        body: { starred },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Whatsapp', id: `MSGS-${arg.id}` }, { type: 'Whatsapp', id: 'STARRED' }],
    }),
    uploadWhatsAppMedia: build.mutation({
      query: (file) => {
        const body = new FormData()
        body.append('file', file)
        return { url: '/whatsapp/media', method: 'POST', body }
      },
    }),
    sendWhatsAppTemplateMessage: build.mutation({
      query: ({ id, ...body }) => ({ url: `/whatsapp/conversations/${id}/messages/template`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Whatsapp', id: `MSGS-${arg.id}` },
        { type: 'Whatsapp', id: 'CONV_LIST' },
      ],
    }),
    getWhatsAppTemplates: build.query({
      query: () => '/whatsapp/templates',
      providesTags: [{ type: 'Whatsapp', id: 'TEMPLATES' }],
    }),
    createWhatsAppTemplate: build.mutation({
      query: (body) => ({ url: '/whatsapp/templates', method: 'POST', body }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'TEMPLATES' }],
    }),
    syncWhatsAppTemplates: build.mutation({
      query: () => ({ url: '/whatsapp/templates/sync', method: 'POST' }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'TEMPLATES' }],
    }),
    deleteWhatsAppTemplate: build.mutation({
      query: (id) => ({ url: `/whatsapp/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Whatsapp', id: 'TEMPLATES' }],
    }),
  }),
})

export const {
  useGetWhatsAppSettingsQuery,
  useSaveWhatsAppSettingsMutation,
  useRegenerateWhatsAppVerifyTokenMutation,
  useGetWhatsAppUnreadBadgeQuery,
  useGetWhatsAppConversationsQuery,
  useCreateWhatsAppConversationMutation,
  useUpdateWhatsAppConversationMutation,
  useReorderWhatsAppPinnedChatsMutation,
  useDeleteWhatsAppConversationMutation,
  useMarkWhatsAppConversationUnreadMutation,
  useGetWhatsAppMessagesQuery,
  useLazyGetWhatsAppMessagesQuery,
  useLazySearchWhatsAppMessagesQuery,
  useGetWhatsAppStarredMessagesQuery,
  useMarkWhatsAppConversationReadMutation,
  useSendWhatsAppMessageMutation,
  useReactToWhatsAppMessageMutation,
  useStarWhatsAppMessageMutation,
  useUploadWhatsAppMediaMutation,
  useSendWhatsAppTemplateMessageMutation,
  useGetWhatsAppTemplatesQuery,
  useCreateWhatsAppTemplateMutation,
  useSyncWhatsAppTemplatesMutation,
  useDeleteWhatsAppTemplateMutation,
} = whatsappApi
