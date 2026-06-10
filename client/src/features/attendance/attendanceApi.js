import { baseApi } from '@/features/api/baseApi'

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAttendanceToday: build.query({
      query: () => '/attendance/today',
      providesTags: [{ type: 'Attendance', id: 'TODAY' }],
    }),
    checkIn: build.mutation({
      query: () => ({ url: '/attendance/check-in', method: 'POST' }),
      invalidatesTags: [{ type: 'Attendance', id: 'TODAY' }, { type: 'Attendance', id: 'ME' }],
    }),
    checkOut: build.mutation({
      query: () => ({ url: '/attendance/check-out', method: 'POST' }),
      invalidatesTags: [{ type: 'Attendance', id: 'TODAY' }, { type: 'Attendance', id: 'ME' }],
    }),
    getMyAttendance: build.query({
      query: ({ year, month }) => ({ url: '/attendance/me', params: { year, month } }),
      providesTags: [{ type: 'Attendance', id: 'ME' }],
    }),
    getTeamAttendance: build.query({
      query: (params) => ({ url: '/attendance/team', params }),
      providesTags: [{ type: 'Attendance', id: 'TEAM' }],
    }),
    getAttendanceDayDetail: build.query({
      query: (date) => `/attendance/day/${date}`,
      providesTags: (_r, _e, date) => [{ type: 'Attendance', id: `DAY-${date}` }],
    }),
    exportAttendanceCsv: build.query({
      query: ({ year, month }) => ({
        url: '/attendance/export',
        params: { year, month },
        responseHandler: (response) => response.text(),
      }),
    }),
    editAttendanceLog: build.mutation({
      query: ({ id, ...body }) => ({ url: `/attendance/logs/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Attendance', id: 'TEAM' },
        { type: 'Attendance', id: `LOG-${id}` },
      ],
    }),
    createAttendanceLog: build.mutation({
      query: (body) => ({ url: '/attendance/logs', method: 'POST', body }),
      invalidatesTags: [{ type: 'Attendance', id: 'TEAM' }],
    }),
  }),
})

export const {
  useGetAttendanceTodayQuery,
  useCheckInMutation,
  useCheckOutMutation,
  useGetMyAttendanceQuery,
  useGetTeamAttendanceQuery,
  useGetAttendanceDayDetailQuery,
  useLazyExportAttendanceCsvQuery,
  useEditAttendanceLogMutation,
  useCreateAttendanceLogMutation,
} = attendanceApi
