import { create } from 'zustand';
import { leaveService } from '../services/leaveService';

export const useLeaveStore = create((set, get) => ({
  leaveTypes:       [],
  balance:          [],
  myRequests:       [],
  pendingApprovals: [],
  isLoading:        false,
  isRefreshing:     false,
  error:            null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const [types, balance, requests] = await Promise.allSettled([
        leaveService.getLeaveTypes(),
        leaveService.getMyBalance(),
        leaveService.getMyRequests(),
      ]);
      set({
        leaveTypes:   types.status === 'fulfilled'    ? (types.value?.data || [])      : [],
        balance:      balance.status === 'fulfilled'  ? (balance.value?.data || [])    : [],
        myRequests:   requests.status === 'fulfilled' ? (requests.value?.data?.rows || requests.value?.rows || []) : [],
        isLoading:    false,
      });
    } catch (e) {
      set({ isLoading: false, error: e?.message || 'Failed to load leave data' });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    await get().load();
    set({ isRefreshing: false });
  },

  loadPendingApprovals: async () => {
    try {
      const data = await leaveService.getPendingApprovals();
      set({ pendingApprovals: data?.data || data || [] });
    } catch {}
  },

  applyLeave: async (formData) => {
    const res = await leaveService.applyLeave(formData);
    await get().load();
    return res;
  },

  approveLeave: async (id) => {
    await leaveService.approveLeave(id);
    set((s) => ({
      pendingApprovals: s.pendingApprovals.filter((r) => r.id !== id),
    }));
  },

  rejectLeave: async (id, reason) => {
    await leaveService.rejectLeave(id, reason);
    set((s) => ({
      pendingApprovals: s.pendingApprovals.filter((r) => r.id !== id),
    }));
  },

  cancelLeave: async (id) => {
    await leaveService.cancelLeave(id);
    await get().load();
  },
}));
