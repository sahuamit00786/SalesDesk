import { baseApi } from '@/features/api/baseApi'

export const remindersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReminders: builder.query({
      query: ({ from, to, status, ownerUserId, targetType, page, limit }) => ({
        url: '/reminders',
        params: {
          from,
          to,
          status,
          ownerUserId,
          targetType,
          page,
          limit,
        },
      }),
      providesTags: ['Reminders'],
    }),

    createReminder: builder.mutation({
      query: (body) => ({
        url: '/reminders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Reminders', 'CalendarEvents', 'CalendarToday'],
    }),

    patchReminder: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/reminders/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Reminders', 'CalendarEvents', 'CalendarToday'],
    }),

    deleteReminder: builder.mutation({
      query: (id) => ({
        url: `/reminders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Reminders', 'CalendarEvents', 'CalendarToday'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetRemindersQuery,
  useCreateReminderMutation,
  usePatchReminderMutation,
  useDeleteReminderMutation,
} = remindersApi
