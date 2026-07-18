import { baseApi } from '@/features/api/baseApi'

export const billingProfileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBillingProfile: build.query({
      query: () => '/billing-profile',
      providesTags: [{ type: 'BillingProfile', id: 'CURRENT' }],
    }),
    patchBillingProfile: build.mutation({
      query: (body) => ({ url: '/billing-profile', method: 'PATCH', body }),
      invalidatesTags: [{ type: 'BillingProfile', id: 'CURRENT' }],
    }),
  }),
})

export const { useGetBillingProfileQuery, usePatchBillingProfileMutation } = billingProfileApi
