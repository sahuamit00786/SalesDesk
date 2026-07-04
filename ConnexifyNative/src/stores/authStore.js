import { create } from 'zustand';
import { post, get } from '../api/client';
import { saveTokens, clearTokens, loadTokens, migrateLegacyTokens } from '../api/tokenStore';
import { useWorkspaceStore } from './workspaceStore';

// status: 'boot' (hydrating) | 'authed' | 'guest'
export const useAuthStore = create((set, getState) => ({
  user: null,
  accessToken: null,
  status: 'boot',

  /** App cold start: keychain → session restore → /auth/me refresh. */
  bootstrap: async () => {
    await useWorkspaceStore.getState().hydrate();
    const tokens = (await migrateLegacyTokens()) || (await loadTokens());
    if (!tokens?.accessToken) {
      set({ status: 'guest' });
      return;
    }
    set({ accessToken: tokens.accessToken });
    try {
      const { data: user } = await get('/auth/me'); // 401 here auto-refreshes via interceptor
      getState().setSession({ user, accessToken: (await loadTokens())?.accessToken });
    } catch {
      // refresh failed → interceptor already cleared; fall through to guest
      set({ user: null, accessToken: null, status: 'guest' });
    }
  },

  /** After login / refresh / me — sets user and access token. */
  setSession: ({ user, accessToken }) => {
    set((s) => ({
      user: user || s.user,
      accessToken: accessToken || s.accessToken,
      status: 'authed',
    }));
  },

  login: async (email, password) => {
    const { data } = await post('/auth/login', { email: email.trim().toLowerCase(), password });
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    getState().setSession({ user: data.user, accessToken: data.accessToken });
    return data.user;
  },

  refreshMe: async () => {
    const { data: user } = await get('/auth/me');
    set({ user });
    return user;
  },

  updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),

  logout: async () => {
    try {
      await post('/auth/logout');
    } catch {}
    await clearTokens();
    await useWorkspaceStore.getState().clear();
    set({ user: null, accessToken: null, status: 'guest' });
  },

  /** Called by the http client when refresh fails — local teardown only. */
  expireSession: async () => {
    await clearTokens();
    await useWorkspaceStore.getState().clear();
    set({ user: null, accessToken: null, status: 'guest' });
  },
}));

// ---- Role helpers (server truth: isCompanyAdmin + companyRole.userRoleKind) ----

export function isCompanyAdmin(user) {
  return Boolean(user?.isCompanyAdmin);
}

export function isManagerOrAdmin(user) {
  if (isCompanyAdmin(user)) return true;
  const kind = String(user?.companyRole?.userRoleKind || '').toLowerCase();
  return kind === 'manager' || kind === 'workspace_admin';
}
