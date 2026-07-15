import { createSlice } from '@reduxjs/toolkit'
import { setCredentials, updateSessionUser, logout } from '@/features/auth/authSlice'

const WORKSPACE_ID_KEY = 'leadflow.workspaceId'
/** Session-scoped: survives reload, cleared on tab close and on every fresh login. */
const WORKSPACE_CONFIRMED_KEY = 'leadflow.workspaceConfirmed'

function workspacesFromUser(user) {
  const ws = user?.company?.workspaces
  if (!Array.isArray(ws) || !ws.length) return []
  return ws
    .filter((w) => !w.archived)
    .map((w) => ({
      id: w.id,
      name: w.name,
      themeColor: w.themeColor || null,
      sidebarTextColor: w.sidebarTextColor || null,
      defaultCurrency: w.defaultCurrency || null,
    }))
}

function readStoredPreferenceId() {
  try {
    return localStorage.getItem(WORKSPACE_ID_KEY)
  } catch {
    return null
  }
}

function pickActiveId(list, previousId, storedPreference) {
  if (!list.length) return null
  if (previousId && list.some((w) => w.id === previousId)) return previousId
  if (storedPreference && list.some((w) => w.id === storedPreference)) return storedPreference
  return list[0].id
}

function persistPreference(id) {
  if (!id) {
    try {
      localStorage.removeItem(WORKSPACE_ID_KEY)
    } catch {
      // ignore
    }
    return
  }
  try {
    localStorage.setItem(WORKSPACE_ID_KEY, id)
  } catch {
    // ignore
  }
}

function readStoredConfirmed() {
  try {
    return sessionStorage.getItem(WORKSPACE_CONFIRMED_KEY) === '1'
  } catch {
    return false
  }
}

function persistConfirmed(confirmed) {
  try {
    if (confirmed) sessionStorage.setItem(WORKSPACE_CONFIRMED_KEY, '1')
    else sessionStorage.removeItem(WORKSPACE_CONFIRMED_KEY)
  } catch {
    // ignore
  }
}

/** A lone workspace needs no choosing — confirm it so the picker never shows. */
function isAutoConfirmable(list) {
  return list.length === 1
}

const initialState = {
  /** Last explicit choice; validated against current workspace list in selectors. */
  activeWorkspaceId: readStoredPreferenceId(),
  /** False until the user picks a workspace for this session; gates the app behind the picker. */
  workspaceConfirmed: readStoredConfirmed(),
}

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspace: (state, action) => {
      const id = action.payload
      state.activeWorkspaceId = id
      persistPreference(id)
      state.workspaceConfirmed = Boolean(id)
      persistConfirmed(Boolean(id))
    },
  },
  extraReducers: (builder) => {
    builder
      // Fresh login drops any prior confirmation so the picker runs again. Silent token
      // refreshes reuse this action, and must keep the session's existing choice.
      .addCase(setCredentials, (state, action) => {
        const list = workspacesFromUser(action.payload?.user)
        if (!list.length) {
          state.activeWorkspaceId = null
          persistPreference(null)
          state.workspaceConfirmed = false
          persistConfirmed(false)
          return
        }
        const silent = action.payload?.silent === true
        const stillValid =
          silent && state.workspaceConfirmed && list.some((w) => w.id === state.activeWorkspaceId)
        const next = pickActiveId(list, state.activeWorkspaceId, readStoredPreferenceId())
        state.activeWorkspaceId = next
        persistPreference(next)
        const confirmed = stillValid || isAutoConfirmable(list)
        state.workspaceConfirmed = confirmed
        persistConfirmed(confirmed)
      })
      // Reload / periodic /auth/me: keep an existing confirmation unless access changed.
      .addCase(updateSessionUser, (state, action) => {
        const list = workspacesFromUser(action.payload)
        if (!list.length) {
          state.activeWorkspaceId = null
          persistPreference(null)
          state.workspaceConfirmed = false
          persistConfirmed(false)
          return
        }
        // Access to the confirmed workspace can be revoked server-side. Test the id the
        // user actually confirmed, before pickActiveId falls back to another workspace.
        const stillValid = state.workspaceConfirmed && list.some((w) => w.id === state.activeWorkspaceId)
        const next = pickActiveId(list, state.activeWorkspaceId, readStoredPreferenceId())
        state.activeWorkspaceId = next
        persistPreference(next)
        const confirmed = stillValid || isAutoConfirmable(list)
        state.workspaceConfirmed = confirmed
        persistConfirmed(confirmed)
      })
      .addCase(logout, (state) => {
        state.activeWorkspaceId = null
        persistPreference(null)
        state.workspaceConfirmed = false
        persistConfirmed(false)
      })
  },
})

export const { setActiveWorkspace } = workspaceSlice.actions

export const selectWorkspaceList = (state) => {
  const ws = state.auth.user?.company?.workspaces
  if (Array.isArray(ws) && ws.length) {
    return ws
      .filter((w) => !w.archived)
      .map((w) => ({
      id: w.id,
      name: w.name,
      themeColor: w.themeColor || null,
      sidebarTextColor: w.sidebarTextColor || null,
      defaultCurrency: w.defaultCurrency || null,
    }))
  }
  return []
}

export const selectWorkspaceConfirmed = (state) => state.workspace.workspaceConfirmed

export const selectResolvedActiveWorkspaceId = (state) => {
  const list = selectWorkspaceList(state)
  const pref = state.workspace.activeWorkspaceId
  if (!list.length) {
    if (pref && state.auth?.accessToken) return pref
    return null
  }
  if (pref && list.some((w) => w.id === pref)) return pref
  return list[0].id
}

export const selectActiveWorkspace = (state) => {
  const list = selectWorkspaceList(state)
  const id = selectResolvedActiveWorkspaceId(state)
  return list.find((w) => w.id === id) ?? list[0] ?? null
}

export const selectActiveWorkspaceName = (state) => selectActiveWorkspace(state)?.name ?? 'Workspace'

export const selectEffectiveCurrency = (state) => {
  const ws = selectActiveWorkspace(state)
  const company = state.auth.user?.company
  if (ws?.defaultCurrency) return String(ws.defaultCurrency).toUpperCase()
  if (company?.baseCurrency) return String(company.baseCurrency).toUpperCase()
  return 'USD'
}

export default workspaceSlice.reducer
