import { baseApi } from '@/features/api/baseApi'

export const filterPresetsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFilterPresets: build.query({
      query: (module) => ({ url: '/filter-presets', params: { module } }),
      providesTags: ['FilterPreset'],
    }),
    createFilterPreset: build.mutation({
      query: (body) => ({ url: '/filter-presets', method: 'POST', body }),
      invalidatesTags: ['FilterPreset'],
    }),
    deleteFilterPreset: build.mutation({
      query: (id) => ({ url: `/filter-presets/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FilterPreset'],
    }),
  }),
})

export const {
  useGetFilterPresetsQuery,
  useCreateFilterPresetMutation,
  useDeleteFilterPresetMutation,
} = filterPresetsApi
