import { baseApi } from '@/features/api/baseApi'
import { setCredentials, logout } from '@/features/auth/authSlice'
import { hasRealMenuAccess } from '@/utils/menuAccess'

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          // A user with zero real menu grants can't do anything in the app — keep them off
          // the login page's session state entirely so no dashboard flash/redirect happens;
          // LoginPage shows the "no permissions" toast instead.
          if (data?.success && data?.data?.accessToken && hasRealMenuAccess(data.data.user)) {
            dispatch(
              setCredentials({
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
                user: data.data.user,
              }),
            )
          }
        } catch {
          dispatch(logout())
        }
      },
    }),
    register: build.mutation({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),
    verifyEmail: build.mutation({
      query: (body) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data?.success && data?.data?.accessToken) {
            dispatch(
              setCredentials({
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
                user: data.data.user,
              }),
            )
          }
        } catch {
          // Wrong OTP should not clear an unrelated session
        }
      },
    }),
    resendVerification: build.mutation({
      query: (body) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body,
      }),
    }),
    refresh: build.mutation({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
    }),
    acceptInvitation: build.mutation({
      query: (body) => ({
        url: '/auth/invitations/accept',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (data?.success && data?.data?.accessToken) {
            dispatch(
              setCredentials({
                accessToken: data.data.accessToken,
                refreshToken: data.data.refreshToken,
                user: data.data.user,
              }),
            )
          }
        } catch {
          // invitation validation errors are shown in UI
        }
      },
    }),
    me: build.query({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    logout: build.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getInvitationPreview: build.query({
      query: ({ invitationId, token }) => ({
        url: '/auth/invitations/preview',
        params: { invitationId, token },
      }),
    }),
    forgotPassword: build.mutation({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: build.mutation({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),
    changePassword: build.mutation({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useRefreshMutation,
  useAcceptInvitationMutation,
  useMeQuery,
  useLogoutMutation,
  useGetInvitationPreviewQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} = authApi
