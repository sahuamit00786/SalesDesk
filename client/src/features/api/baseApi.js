import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { readAuthFromStorage, setCredentials, logout } from '@/features/auth/authSlice'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const workspaceId = getState()?.workspace?.activeWorkspaceId
    const fromStore = getState()?.auth?.accessToken
    const fromStorage = readAuthFromStorage().accessToken
    const token = fromStore || fromStorage
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    if (workspaceId) {
      headers.set('x-workspace-id', workspaceId)
    }
    // Avoid 304 responses for API JSON endpoints. RTK Query expects a payload body.
    headers.set('Cache-Control', 'no-store')
    headers.set('Pragma', 'no-cache')
    return headers
  },
})

function isAuthRefreshExempt(args) {
  const url = typeof args === 'string' ? args : args?.url ?? ''
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/resend-verification') ||
    url.includes('/auth/verify-email')
  )
}

let refreshPromise = null

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status !== 401 || isAuthRefreshExempt(args)) {
    return result
  }

  const refreshToken =
    api.getState().auth.refreshToken ?? readAuthFromStorage().refreshToken

  if (!refreshToken) {
    api.dispatch(logout())
    return result
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshResult = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
        api,
        extraOptions,
      )
      const d = refreshResult.data
      if (d?.success && d?.data?.accessToken) {
        api.dispatch(
          setCredentials({
            accessToken: d.data.accessToken,
            refreshToken: d.data.refreshToken,
            user: d.data.user,
          }),
        )
      } else {
        api.dispatch(logout())
      }
    })().finally(() => {
      refreshPromise = null
    })
  }

  await refreshPromise

  if (!api.getState().auth.accessToken && !readAuthFromStorage().accessToken) {
    return result
  }

  return rawBaseQuery(args, api, extraOptions)
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Lead', 'Contact', 'Task', 'Analytics', 'Pipeline', 'Workspace', 'Team'],
  endpoints: () => ({}),
})
