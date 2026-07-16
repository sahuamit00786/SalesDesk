import { baseApi } from '@/features/api/baseApi'

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotificationEmailSettings: build.query({
      query: () => '/settings/notification-emails',
      providesTags: [{ type: 'NotificationSettings', id: 'EMAIL' }],
    }),
    patchNotificationEmailSettings: build.mutation({
      query: (body) => ({
        url: '/settings/notification-emails',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [{ type: 'NotificationSettings', id: 'EMAIL' }],
    }),
    getNotificationDeliveryHistory: build.query({
      query: (params = {}) => ({
        url: '/settings/notification-emails/history',
        params,
      }),
      providesTags: (result) =>
        result?.data?.length
          ? [
              { type: 'NotificationDeliveryHistory', id: 'LIST' },
              ...result.data.map((row) => ({ type: 'NotificationDeliveryHistory', id: row.id })),
            ]
          : [{ type: 'NotificationDeliveryHistory', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetNotificationEmailSettingsQuery,
  usePatchNotificationEmailSettingsMutation,
  useGetNotificationDeliveryHistoryQuery,
} = settingsApi
