import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'connexify.syncedCallLogIds';

// Tracks which device call-log rows (by native _ID) have already been synced
// into a CallLog record, so re-opening the screen doesn't offer them again.
export const useCallSyncStore = create((set, get) => ({
  syncedIds: new Set(),
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const ids = stored ? JSON.parse(stored) : [];
      set({ syncedIds: new Set(Array.isArray(ids) ? ids : []), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  markSynced: async (ids) => {
    const next = new Set(get().syncedIds);
    for (const id of ids) next.add(id);
    set({ syncedIds: next });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {}
  },
}));
