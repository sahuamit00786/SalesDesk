import { create } from 'zustand';
import { getCallLogs, requestCallLogPermission } from '../services/callSyncService';

export const useCallSyncStore = create((set, get) => ({
  logs:          [],
  filtered:      [],
  filters: {
    search:    '',
    types:     [],   // 'incoming' | 'outgoing' | 'missed'
    dateFrom:  null,
    dateTo:    null,
    minDuration: 0,
  },
  isLoading:    false,
  hasPermission: null,
  lastSynced:   null,
  error:        null,

  setFilters: (patch) => {
    set((s) => {
      const filters = { ...s.filters, ...patch };
      const filtered = applyFilters(s.logs, filters);
      return { filters, filtered };
    });
  },

  resetFilters: () => {
    set((s) => ({ filters: { search: '', types: [], dateFrom: null, dateTo: null, minDuration: 0 }, filtered: s.logs }));
  },

  syncCallLogs: async () => {
    set({ isLoading: true, error: null });
    const granted = await requestCallLogPermission();
    if (!granted) {
      set({ isLoading: false, hasPermission: false, error: 'Call log permission denied' });
      return false;
    }
    try {
      const raw = await getCallLogs({ limit: 1000 });
      const logs = (raw || []).map((entry, idx) => ({
        id:           String(idx),
        name:         entry.name || entry.cachedName || null,
        number:       entry.phoneNumber || entry.number || '',
        type:         resolveType(entry.type),
        rawType:      entry.type,
        duration:     Number(entry.duration || 0),
        date:         new Date(Number(entry.date || entry.timestamp || 0)),
        timestamp:    Number(entry.date || entry.timestamp || 0),
      }));
      logs.sort((a, b) => b.timestamp - a.timestamp);
      const { filters } = get();
      set({ logs, filtered: applyFilters(logs, filters), isLoading: false, hasPermission: true, lastSynced: new Date(), error: null });
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
function resolveType(raw) {
  const n = Number(raw);
  if (n === 1) return 'incoming';
  if (n === 2) return 'outgoing';
  if (n === 3) return 'missed';
  return 'other';
}

function applyFilters(logs, filters) {
  let result = logs;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((l) =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.number || '').includes(q)
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
