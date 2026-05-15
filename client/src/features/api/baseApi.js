import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { readAuthFromStorage, setCredentials, logout } from '@/features/auth/authSlice'
import { selectResolvedActiveWorkspaceId } from '@/features/workspace/workspaceSlice'

function resolveAccessToken(getState) {
  const fromStore = getState()?.auth?.accessToken
  const fromStorage = readAuthFromStorage().accessToken
  const pick = (t) => {
    if (typeof t !== 'string') return ''
    const s = t.trim()
    if (!s || s === 'undefined' || s === 'null') return ''
    return s
  }
  return pick(fromStore) || pick(fromStorage) || null
}

function isUnauthorized(error) {
  if (!error) return false
  const s = error.status ?? error.originalStatus
  return s === 401 || s === '401'
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState()
    const token = resolveAccessToken(getState)
    const resolvedWs = selectResolvedActiveWorkspaceId(state)
    const workspaceId =
      resolvedWs ||
      (token ? state.workspace?.activeWorkspaceId?.trim?.() || null : null)
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

  if (!isUnauthorized(result.error) || isAuthRefreshExempt(args)) {
    return result
  }

  const stored = readAuthFromStorage()
  const refreshToken =
    (api.getState().auth.refreshToken && String(api.getState().auth.refreshToken).trim()) ||
    (stored.refreshToken && String(stored.refreshToken).trim()) ||
    null

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
      if (!refreshResult.error && d?.success && d?.data?.accessToken) {
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

  if (!resolveAccessToken(api.getState)) {
    return result
  }

  return rawBaseQuery(args, api, extraOptions)
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'Lead',
    'Contact',
    'Task',
    'Email',
    'Analytics',
    'Pipeline',
    'Workspace',
    'Team',
    'Document',
    'Opportunity',
    'Meetings',
    'CalendarEvents',
    'CalendarToday',
    'Reminders',
    'Template',
    'TemplateHistory',
    'BillingProfile',
    'Quotation',
    'QuotationTemplate',
    'Invoice',
    'InvoiceTemplate',
    'Deal',
    'DealActivity',
    'Campaign',
    'Workflow',
    'WorkflowRun',
    'Attendance',
    'Leave',
    'Notification',
  ],
  endpoints: () => ({}),
})
