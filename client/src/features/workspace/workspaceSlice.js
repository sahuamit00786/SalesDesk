import { createSlice } from '@reduxjs/toolkit'
import { setCredentials, updateSessionUser, logout } from '@/features/auth/authSlice'

const WORKSPACE_ID_KEY = 'leadflow.workspaceId'

function workspacesFromUser(user) {
  const ws = user?.company?.workspaces
  if (!Array.isArray(ws) || !ws.length) return []
  return ws
    .filter((w) => !w.archived)
    .map((w) => ({ id: w.id, name: w.name }))
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

const initialState = {
  /** Last explicit choice; validated against current workspace list in selectors. */
  activeWorkspaceId: readStoredPreferenceId(),
}

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspace: (state, action) => {
      const id = action.payload
      state.activeWorkspaceId = id
      persistPreference(id)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setCredentials, (state, action) => {
        const list = workspacesFromUser(action.payload?.user)
        if (!list.length) {
          state.activeWorkspaceId = null
          persistPreference(null)
          return
        }
        const next = pickActiveId(list, state.activeWorkspaceId, readStoredPreferenceId())
        state.activeWorkspaceId = next
        persistPreference(next)
      })
      .addCase(updateSessionUser, (state, action) => {
        const list = workspacesFromUser(action.payload)
        if (!list.length) {
          state.activeWorkspaceId = null
          persistPreference(null)
          return
        }
        const next = pickActiveId(list, state.activeWorkspaceId, readStoredPreferenceId())
        state.activeWorkspaceId = next
        persistPreference(next)
      })
      .addCase(logout, (state) => {
        state.activeWorkspaceId = null
        persistPreference(null)
      })
  },
})

export const { setActiveWorkspace } = workspaceSlice.actions

export const selectWorkspaceList = (state) => {
  const ws = state.auth.user?.company?.workspaces
  if (Array.isArray(ws) && ws.length) {
    return ws
      .filter((w) => !w.archived)
      .map((w) => ({ id: w.id, name: w.name }))
  }
  return []
}

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

export default workspaceSlice.reducer
