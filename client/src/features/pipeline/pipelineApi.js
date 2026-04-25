import { baseApi } from '@/features/api/baseApi'

export const pipelineApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPipelines: build.query({
      query: () => '/pipelines',
      providesTags: [{ type: 'Pipeline', id: 'LIST' }],
    }),
  }),
})

export const { useGetPipelinesQuery } = pipelineApi
