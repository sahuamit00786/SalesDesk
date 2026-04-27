import { baseApi } from '@/features/api/baseApi'

export const activitiesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getActivitiesFeed: build.query({
      query: (params) => ({ url: '/activities', params }),
      providesTags: [{ type: 'Lead', id: 'ACTIVITIES_FEED' }],
    }),
    getActivityTypes: build.query({
      query: () => '/activities/types',
      providesTags: [{ type: 'Lead', id: 'ACTIVITY_TYPES' }],
    }),
    createActivityType: build.mutation({
      query: (body) => ({ url: '/activities/types', method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'ACTIVITY_TYPES' }],
    }),
    patchActivityType: build.mutation({
      query: ({ id, ...body }) => ({ url: `/activities/types/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Lead', id: 'ACTIVITY_TYPES' }],
    }),
    deleteActivityType: build.mutation({
      query: (id) => ({ url: `/activities/types/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Lead', id: 'ACTIVITY_TYPES' }],
    }),
    createActivityReminder: build.mutation({
      query: ({ activityId, ...body }) => ({ url: `/activities/${activityId}/reminders`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Lead', id: 'ACTIVITIES_REMINDERS' }],
    }),
    getUpcomingReminders: build.query({
      query: (params) => ({ url: '/activities/reminders/upcoming', params }),
      providesTags: [{ type: 'Lead', id: 'ACTIVITIES_REMINDERS' }],
    }),
  }),
})

export const {
  useGetActivitiesFeedQuery,
  useGetActivityTypesQuery,
  useCreateActivityTypeMutation,
  usePatchActivityTypeMutation,
  useDeleteActivityTypeMutation,
  useCreateActivityReminderMutation,
  useGetUpcomingRemindersQuery,
} = activitiesApi
