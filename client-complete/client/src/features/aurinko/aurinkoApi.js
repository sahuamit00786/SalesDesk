import { baseApi } from '@/features/api/baseApi'

/**
 * Aurinko — "Continue with Google" for Gmail + Google Calendar.
 * Email flows keep using the existing /email/mailbox-* endpoints (the server
 * transparently serves those from Aurinko once connected); this slice covers
 * connection management and the calendar endpoints.
 */
export const aurinkoApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAurinkoStatus: build.query({
      query: () => '/aurinko/status',
      providesTags: [{ type: 'Email', id: 'AURINKO_STATUS' }],
    }),
    getAurinkoConnectUrl: build.mutation({
      query: (params) => ({ url: '/aurinko/connect-url', params }),
    }),
    disconnectAurinko: build.mutation({
      query: () => ({ url: '/aurinko/disconnect', method: 'POST' }),
      invalidatesTags: [
        { type: 'Email', id: 'AURINKO_STATUS' },
        { type: 'Email', id: 'MAILBOX_THREADS' },
        { type: 'Email', id: 'MAILBOX_BADGE' },
      ],
    }),
    getAurinkoCalendars: build.query({
      query: () => '/aurinko/calendars',
      providesTags: [{ type: 'CalendarEvents', id: 'AURINKO_CALENDARS' }],
    }),
    getAurinkoCalendarEvents: build.query({
      query: ({ calendarId = 'primary', from, to } = {}) => ({
        url: `/aurinko/calendars/${encodeURIComponent(calendarId)}/events`,
        params: { from, to },
      }),
      providesTags: (_r, _e, arg) => [
        { type: 'CalendarEvents', id: `AURINKO-${arg?.calendarId || 'primary'}` },
      ],
    }),
    subscribeAurinkoCalendar: build.mutation({
      query: (body) => ({ url: '/aurinko/calendar/subscribe', method: 'POST', body }),
      invalidatesTags: [{ type: 'Email', id: 'AURINKO_STATUS' }],
    }),
  }),
})

export const {
  useGetAurinkoStatusQuery,
  useGetAurinkoConnectUrlMutation,
  useDisconnectAurinkoMutation,
  useGetAurinkoCalendarsQuery,
  useGetAurinkoCalendarEventsQuery,
  useSubscribeAurinkoCalendarMutation,
} = aurinkoApi
