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
    provisionMyWorkspace: build.mutation({
      query: () => ({
        url: '/company/me/provision-workspace',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Workspace', id: 'LIST' }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const user = data?.data?.user
          if (data?.success && user) {
            dispatch(updateSessionUser(user))
          }
        } catch {
          // Errors surfaced via unwrap in UI
        }
      },
    }),
  }),
})

export const { usePatchMyCompanyMutation, useProvisionMyWorkspaceMutation } = companyApi
