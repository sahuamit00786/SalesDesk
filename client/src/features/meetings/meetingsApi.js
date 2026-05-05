import { baseApi } from '@/features/api/baseApi'

export const meetingsApi = baseApi.injectEndpoints({

  endpoints: (builder) => ({

    getMeetings: builder.query({
      query: (params) => ({
        url: '/meetings',
        params,
      }),
      providesTags: ['Meetings'],
    }),

    getMeeting: builder.query({
      query: (id) => `/meetings/${id}`,
    }),


    createMeeting: builder.mutation({
      query: (body) => ({
        url: '/meetings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Meetings'],
    }),

    updateMeeting: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/meetings/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Meetings'],
    }),

    deleteMeeting: builder.mutation({
      query: (id) => ({
        url: `/meetings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Meetings'],
    }),

    joinMeeting: builder.mutation({
      query: (id) => ({
        url: `/meetings/${id}/join`,
        method: 'POST',
      }),
    }),

  }),

  overrideExisting: false,
})

export const {
  useGetMeetingsQuery,
  useGetMeetingQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useJoinMeetingMutation,
} = meetingsApi