import { baseApi } from '@/features/api/baseApi'

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query({
      query: () => '/settings',
    }),
  }),
})

export const { useGetSettingsQuery } = settingsApi
