import { create } from 'zustand';
import { PermissionsAndroid, Platform } from 'react-native';
import { getSimCards, getCallLogsForSim } from '../services/simCardService';

export const useCallSyncStore = create((set, get) => ({
  // ── Call logs ─────────────────────────────────────────────────
  logs:          [],
  filtered:      [],
  filters: {
    search:      '',
    types:       [],   // 'incoming' | 'outgoing' | 'missed'
    dateFrom:    null,
    dateTo:      null,
    minDuration: 0,
  },
  isLoading:    false,
  hasPermission: null,
  lastSynced:   null,
  error:        null,

  // ── SIM state ─────────────────────────────────────────────────
  simCards:      [],    // [{subscriptionId, slotIndex, carrierName, displayName, number}]
  selectedSimId: -1,    // -1 = All SIMs
  simsLoaded:    false,

  // ── SIM actions ───────────────────────────────────────────────
  loadSimCards: async () => {
    const sims = await getSimCards();
    set({ simCards: sims, simsLoaded: true });
  },

  selectSim: (subscriptionId) => {
    set({ selectedSimId: subscriptionId });
    get().syncCallLogs();
  },

  // ── Filter actions ────────────────────────────────────────────
  setFilters: (patch) => {
    set((s) => {
      const filters = { ...s.filters, ...patch };
      return { filters, filtered: applyFilters(s.logs, filters) };
    });
  },

  resetFilters: () => {
    set((s) => ({
      filters: { search: '', types: [], dateFrom: null, dateTo: null, minDuration: 0 },
      filtered: s.logs,
    }));
  },

  // ── Sync ──────────────────────────────────────────────────────
  syncCallLogs: async () => {
    set({ isLoading: true, error: null });

    const granted = await requestCallLogPermission();
    if (!granted) {
      set({ isLoading: false, hasPermission: false, error: 'Call log permission denied' });
      return false;
    }

    // Load SIM cards if not yet loaded
    if (!get().simsLoaded) {
      await get().loadSimCards();
    }

    try {
      const { selectedSimId, filters } = get();
      const raw = await getCallLogsForSim(selectedSimId, 1000);

      const logs = (raw || []).map((entry, idx) => ({
        id:             String(idx),
        name:           entry.name || null,
        number:         entry.phoneNumber || '',
        type:           resolveType(entry.callType),
        rawType:        entry.callType,
        duration:       Number(entry.callDuration || 0),
        date:           new Date(Number(entry.callDate || 0)),
        timestamp:      Number(entry.callDate || 0),
        subscriptionId: entry.subscriptionId || '',
      }));

      logs.sort((a, b) => b.timestamp - a.timestamp);

      set({
        logs,
        filtered:     applyFilters(logs, filters),
        isLoading:    false,
        hasPermission: true,
        lastSynced:   new Date(),
        error:        null,
      });
      return true;
    } catch (e) {
      set({ isLoading: false, hasPermission: true, error: 'Failed to read call logs' });
      return false;
    }
  },

  activeFilterCount: () => {
    const { filters } = get();
    return (filters.types?.length || 0)
      + (filters.search ? 1 : 0)
      + (filters.dateFrom || filters.dateTo ? 1 : 0)
      + (filters.minDuration > 0 ? 1 : 0);
  },
}));

// ── Helpers ─────────────────────────────────────────────────────
async function requestCallLogPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

function resolveType(raw) {
  const n = Number(raw);
  if (n === 1) return 'incoming';
  if (n === 2) return 'outgoing';
  if (n === 3) return 'missed';
  if (n === 5) return 'rejected';
  return 'other';
}

function applyFilters(logs, filters) {
  let result = logs;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((l) =>
      (l.name || '').toLowerCase().includes(q) || (l.number || '').includes(q),
    );
  }
  if (filters.types?.length) {
    result = result.filter((l) => filters.types.includes(l.type));
  }
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
    result = result.filter((l) => l.timestamp >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).setHours(23, 59, 59, 999);
    result = result.filter((l) => l.timestamp <= to);
  }
  if (filters.minDuration > 0) {
    result = result.filter((l) => l.duration >= filters.minDuration);
  }
  return result;
}
