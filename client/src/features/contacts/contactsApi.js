import { baseApi } from '@/features/api/baseApi'

export const contactsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getContacts: build.query({
      query: (params) => ({ url: '/contacts', params }),
      providesTags: [{ type: 'Contact', id: 'LIST' }],
    }),
  }),
})

export const { useGetContactsQuery } = contactsApi
