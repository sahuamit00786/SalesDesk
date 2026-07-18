import { baseApi } from '@/features/api/baseApi'

export const copilotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createCopilotSession: builder.mutation({
      query: () => ({ url: '/copilot/sessions', method: 'POST' }),
      invalidatesTags: ['CopilotSession'],
    }),

    listCopilotSessions: builder.query({
      query: () => '/copilot/sessions',
      providesTags: ['CopilotSession'],
    }),

    getCopilotSessionMessages: builder.query({
      query: (sessionId) => `/copilot/sessions/${sessionId}/messages`,
      providesTags: (result, error, sessionId) => [{ type: 'CopilotSession', id: sessionId }],
    }),

    sendCopilotMessage: builder.mutation({
      query: ({ sessionId, text, selection }) => ({
        url: `/copilot/sessions/${sessionId}/messages`,
        method: 'POST',
        body: selection ? { selection } : { text },
      }),
    }),

    deleteCopilotSession: builder.mutation({
      query: (sessionId) => ({ url: `/copilot/sessions/${sessionId}`, method: 'DELETE' }),
      invalidatesTags: ['CopilotSession'],
    }),
  }),
})

export const {
  useCreateCopilotSessionMutation,
  useListCopilotSessionsQuery,
  useGetCopilotSessionMessagesQuery,
  useSendCopilotMessageMutation,
  useDeleteCopilotSessionMutation,
} = copilotApi
