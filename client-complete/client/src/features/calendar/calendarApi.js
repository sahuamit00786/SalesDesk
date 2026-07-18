import { baseApi } from '@/features/api/baseApi'

export const calendarApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCalendarEvents: builder.query({
      query: ({ from, to, types, ownerUserId, leadId, opportunityId }) => ({
        url: '/calendar/events',
        params: {
          from,
          to,
          types,
          ownerUserId,
          leadId,
          opportunityId,
        },
      }),
      providesTags: ['CalendarEvents'],
    }),

    getCalendarToday: builder.query({
      query: ({ ownerUserId }) => ({
        url: '/calendar/today',
        params: { ownerUserId },
      }),
      providesTags: ['CalendarToday'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetCalendarEventsQuery,
  useGetCalendarTodayQuery,
} = calendarApi
