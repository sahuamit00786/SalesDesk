import { createSlice } from '@reduxjs/toolkit'

export const AUTH_STORAGE_KEY = 'leadflow.auth'

/** Wipe all persisted client data (auth, workspace preference, UI prefs, etc.). */
export function clearClientStorage() {
  try {
    localStorage.clear()
  } catch {
    // ignore private mode / quota errors
  }
}

/** Read session from localStorage (used on store init and as a fallback for API headers). */
export function readAuthFromStorage() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return { accessToken: null, refreshToken: null, user: null }
    }
    const parsed = JSON.parse(raw)
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      user: parsed.user ?? null,
    }
  } catch {
    return { accessToken: null, refreshToken: null, user: null }
  }
}

function readStoredAuth() {
  return readAuthFromStorage()
}

function persistAuth(state) {
  try {
    if (!state.accessToken) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    )
  } catch {
    // ignore quota / private mode
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: readStoredAuth(),
  reducers: {
    setCredentials: (state, action) => {
      state.accessToken = action.payload.accessToken ?? null
      state.refreshToken = action.payload.refreshToken ?? null
      state.user = action.payload.user ?? null
      persistAuth(state)
    },
    logout: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      clearClientStorage()
    },
    updateSessionUser: (state, action) => {
      if (action.payload == null) return
      state.user = action.payload
      persistAuth(state)
    },
  },
})

export const { setCredentials, logout, updateSessionUser } = authSlice.actions
export default authSlice.reducer
