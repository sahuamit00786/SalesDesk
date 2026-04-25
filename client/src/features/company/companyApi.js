import { baseApi } from '@/features/api/baseApi'
import { updateSessionUser } from '@/features/auth/authSlice'

export const companyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    patchMyCompany: build.mutation({
      query: (body) => ({
        url: '/company/me',
        method: 'PATCH',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data?.success && data?.data) {
            dispatch(updateSessionUser(data.data))
          }
        } catch {
          // Errors surfaced via unwrap in UI
        }
      },
    }),
  }),
})

export const { usePatchMyCompanyMutation } = companyApi
