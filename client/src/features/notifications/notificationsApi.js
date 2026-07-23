import { baseApi } from '@/features/api/baseApi'

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query({
      query: ({ page = 1, limit = 25, unreadOnly = false, range = 'all', category = 'all' } = {}) => ({
        url: '/notifications',
        params: { page, limit, unreadOnly, range, category },
      }),
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    getUnreadCount: build.query({
      query: () => '/notifications/unread-count',
      providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
    }),
    getNotificationSummary: build.query({
      query: () => '/notifications/summary',
      providesTags: [{ type: 'Notification', id: 'SUMMARY' }],
    }),
    markNotificationRead: build.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
        { type: 'Notification', id: 'SUMMARY' },
      ],
    }),
    markAllNotificationsRead: build.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
        { type: 'Notification', id: 'SUMMARY' },
      ],
    }),
    markNotificationsSeen: build.mutation({
      query: (ids) => ({ url: '/notifications/mark-seen', method: 'POST', body: { ids } }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useGetNotificationSummaryQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsSeenMutation,
} = notificationsApi
