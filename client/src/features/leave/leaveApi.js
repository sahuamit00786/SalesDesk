import { baseApi } from '@/features/api/baseApi'

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLeaveTypes: build.query({
      query: () => '/leave/types',
      providesTags: [{ type: 'Leave', id: 'TYPES' }],
    }),
    createLeaveType: build.mutation({
      query: (body) => ({ url: '/leave/types', method: 'POST', body }),
      invalidatesTags: [{ type: 'Leave', id: 'TYPES' }],
    }),
    updateLeaveType: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leave/types/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Leave', id: 'TYPES' }],
    }),
    deleteLeaveType: build.mutation({
      query: (id) => ({ url: `/leave/types/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Leave' }],
    }),
    getMyLeaveBalance: build.query({
      query: (year) => ({ url: '/leave/balance/me', params: { year } }),
      providesTags: [{ type: 'Leave', id: 'BALANCE_ME' }],
    }),
    getUserLeaveBalance: build.query({
      query: ({ userId, year }) => ({ url: `/leave/balance/${userId}`, params: { year } }),
    }),
    adjustLeaveBalance: build.mutation({
      query: (body) => ({ url: '/leave/balance/adjust', method: 'POST', body }),
      invalidatesTags: [{ type: 'Leave', id: 'BALANCE_ME' }],
    }),
    previewLeaveDays: build.query({
      query: ({ fromDate, toDate }) => ({ url: '/leave/preview-days', params: { fromDate, toDate } }),
    }),
    getLeaveSettings: build.query({
      query: () => '/leave/settings',
      providesTags: [{ type: 'Leave', id: 'SETTINGS' }],
    }),
    updateLeaveSettings: build.mutation({
      query: (body) => ({ url: '/leave/settings', method: 'PUT', body }),
      invalidatesTags: [{ type: 'Leave', id: 'SETTINGS' }],
    }),
    applyLeave: build.mutation({
      query: (formData) => ({
        url: '/leave/requests',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [
        { type: 'Leave', id: 'REQUESTS_ME' },
        { type: 'Leave', id: 'BALANCE_ME' },
        { type: 'Leave', id: 'CALENDAR' },
        { type: 'Leave', id: 'REQUESTS_ALL' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    getMyLeaves: build.query({
      query: () => '/leave/requests/me',
      providesTags: [{ type: 'Leave', id: 'REQUESTS_ME' }],
    }),
    getAllLeaves: build.query({
      query: (params) => ({ url: '/leave/requests/all', params }),
      providesTags: [{ type: 'Leave', id: 'REQUESTS_ALL' }],
    }),
    approveLeave: build.mutation({
      query: (id) => ({ url: `/leave/requests/${id}/approve`, method: 'POST' }),
      invalidatesTags: [
        { type: 'Leave', id: 'REQUESTS_ALL' },
        { type: 'Leave', id: 'REQUESTS_ME' },
        { type: 'Leave', id: 'CALENDAR' },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
    rejectLeave: build.mutation({
      query: ({ id, rejectionReason }) => ({
        url: `/leave/requests/${id}/reject`,
        method: 'POST',
        body: { rejectionReason },
      }),
      invalidatesTags: [
        { type: 'Leave', id: 'REQUESTS_ALL' },
        { type: 'Leave', id: 'REQUESTS_ME' },
      ],
    }),
    cancelLeave: build.mutation({
      query: (id) => ({ url: `/leave/requests/${id}/cancel`, method: 'POST' }),
      invalidatesTags: [
        { type: 'Leave', id: 'REQUESTS_ME' },
        { type: 'Leave', id: 'BALANCE_ME' },
        { type: 'Leave', id: 'CALENDAR' },
      ],
    }),
    bulkApproveLeaves: build.mutation({
      query: (ids) => ({ url: '/leave/requests/bulk-approve', method: 'POST', body: { ids } }),
      invalidatesTags: [{ type: 'Leave', id: 'REQUESTS_ALL' }, { type: 'Leave', id: 'CALENDAR' }],
    }),
    getLeaveCalendar: build.query({
      query: (params) => ({ url: '/leave/calendar', params }),
      providesTags: [{ type: 'Leave', id: 'CALENDAR' }],
    }),
    getPublicHolidays: build.query({
      query: (year) => ({ url: '/leave/holidays', params: { year } }),
      providesTags: [{ type: 'Leave', id: 'HOLIDAYS' }],
    }),
    createHoliday: build.mutation({
      query: (body) => ({ url: '/leave/holidays', method: 'POST', body }),
      invalidatesTags: [{ type: 'Leave', id: 'HOLIDAYS' }],
    }),
    updateHoliday: build.mutation({
      query: ({ id, ...body }) => ({ url: `/leave/holidays/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Leave', id: 'HOLIDAYS' }],
    }),
    deleteHoliday: build.mutation({
      query: (id) => ({ url: `/leave/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Leave', id: 'HOLIDAYS' }],
    }),
    getNotifications: build.query({
      query: (limit = 20) => ({ url: '/notifications', params: { limit } }),
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markNotificationRead: build.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    markAllNotificationsRead: build.mutation({
      query: () => ({ url: '/notifications/mark-all-read', method: 'POST' }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetLeaveTypesQuery,
  useCreateLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
  useDeleteLeaveTypeMutation,
  useGetMyLeaveBalanceQuery,
  useAdjustLeaveBalanceMutation,
  useLazyPreviewLeaveDaysQuery,
  useGetLeaveSettingsQuery,
  useUpdateLeaveSettingsMutation,
  useApplyLeaveMutation,
  useGetMyLeavesQuery,
  useGetAllLeavesQuery,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
  useCancelLeaveMutation,
  useBulkApproveLeavesMutation,
  useGetLeaveCalendarQuery,
  useGetPublicHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = leaveApi
