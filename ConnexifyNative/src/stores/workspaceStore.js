import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = 'connexify.workspaceId';

// Port of web client/src/features/workspace/workspaceSlice.js
export function workspacesFromUser(user) {
  const ws = user?.company?.workspaces;
  if (!Array.isArray(ws) || !ws.length) return [];
  return ws
    .filter((w) => !w.archived)
    .map((w) => ({
      id: w.id,
      name: w.name,
      themeColor: w.themeColor || null,
      sidebarTextColor: w.sidebarTextColor || null,
      defaultCurrency: w.defaultCurrency || null,
    }));
}

export const useWorkspaceStore = create((set, get) => ({
  preferredId: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(PREF_KEY);
      set({ preferredId: stored || null, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setActive: async (id) => {
    set({ preferredId: id });
    try {
      if (id) await AsyncStorage.setItem(PREF_KEY, id);
      else await AsyncStorage.removeItem(PREF_KEY);
    } catch {}
  },

  clear: async () => {
    set({ preferredId: null });
    try {
      await AsyncStorage.removeItem(PREF_KEY);
    } catch {}
  },
}));

// Selectors take the auth user (kept in authStore) — mirrors web selector layering.
export function resolveWorkspaceId(user, preferredId) {
  const list = workspacesFromUser(user);
  if (!list.length) return preferredId || null;
  if (preferredId && list.some((w) => w.id === preferredId)) return preferredId;
  return list[0].id;
}

export function resolveActiveWorkspace(user, preferredId) {
  const list = workspacesFromUser(user);
  const id = resolveWorkspaceId(user, preferredId);
  return list.find((w) => w.id === id) ?? list[0] ?? null;
}

export function effectiveCurrency(user, preferredId) {
  const ws = resolveActiveWorkspace(user, preferredId);
  if (ws?.defaultCurrency) return String(ws.defaultCurrency).toUpperCase();
  if (user?.company?.baseCurrency) return String(user.company.baseCurrency).toUpperCase();
  return 'USD';
}
