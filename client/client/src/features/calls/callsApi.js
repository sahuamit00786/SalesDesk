import { baseApi } from '@/features/api/baseApi'

export const callsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCalls: build.query({
      query: (params) => ({ url: '/calls', params }),
      providesTags: (result) => [
        { type: 'Calls', id: 'LIST' },
        ...(Array.isArray(result?.data) ? result.data.map((c) => ({ type: 'Calls', id: c.id })) : []),
      ],
    }),
    getCallById: build.query({
      query: (id) => `/calls/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Calls', id }],
    }),
    createCall: build.mutation({
      query: (body) => ({ url: '/calls', method: 'POST', body }),
      invalidatesTags: [{ type: 'Calls', id: 'LIST' }],
    }),
    patchCall: build.mutation({
      query: ({ id, ...body }) => ({ url: `/calls/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Calls', id: 'LIST' }, { type: 'Calls', id: arg.id }],
    }),
    deleteCall: build.mutation({
      query: (id) => ({ url: `/calls/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Calls', id: 'LIST' }],
    }),
    convertCall: build.mutation({
      query: ({ id, ...body }) => ({ url: `/calls/${id}/convert`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Calls', id: 'LIST' }, { type: 'Calls', id: arg.id }, { type: 'Lead', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetCallsQuery,
  useGetCallByIdQuery,
  useCreateCallMutation,
  usePatchCallMutation,
  useDeleteCallMutation,
  useConvertCallMutation,
} = callsApi

export const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'followup_needed', label: 'Follow-up needed' },
]
