import { create } from 'zustand';
import { dealService } from '../services/dealService';

const PAGE_SIZE = 20;

export const useDealStore = create((set, get) => ({
  // ── Deals list ────────────────────────────────────────────────
  deals:        [],
  filters:      { search: '', stage: [] },
  isLoading:    false,
  isRefreshing: false,
  isLoadingMore: false,
  error:        null,
  page:         1,
  hasMore:      true,

  // ── Active deal ───────────────────────────────────────────────
  currentDeal:  null,
  payments:     [],
  activities:   [],
  detailLoading: false,

  // ── Actions ───────────────────────────────────────────────────
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: { search: '', stage: [] } }),

  fetchDeals: async (reset = false) => {
    const { filters, page, deals } = get();
    const newPage = reset ? 1 : page;

    if (reset) {
      set({ isLoading: deals.length === 0, isRefreshing: deals.length > 0, error: null, page: 1, hasMore: true });
    } else {
      if (!get().hasMore) return;
      set({ isLoadingMore: true });
    }

    try {
      const params = {
        page:  newPage,
        limit: PAGE_SIZE,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.stage?.length ? { stage: filters.stage.join(',') } : {}),
      };
      const data = await dealService.getDeals(params);
      const rows  = data?.data?.rows || data?.rows || [];
      const total = data?.data?.count ?? data?.count ?? 0;

      set((s) => ({
        deals:         reset ? rows : [...s.deals, ...rows],
        page:          newPage + 1,
        hasMore:       (reset ? rows.length : s.deals.length + rows.length) < total,
        isLoading:     false,
        isRefreshing:  false,
        isLoadingMore: false,
        error:         null,
      }));
    } catch (e) {
      set({ isLoading: false, isRefreshing: false, isLoadingMore: false, error: e?.message || 'Failed to load deals' });
    }
  },

  refresh: () => get().fetchDeals(true),
  loadMore: () => { if (!get().isLoadingMore && get().hasMore) get().fetchDeals(false); },

  fetchDealDetail: async (id) => {
    set({ currentDeal: null, payments: [], activities: [], detailLoading: true });
    try {
      const [dealData, paymentsData, activitiesData] = await Promise.all([
        dealService.getDeal(id),
        dealService.getDealPayments(id),
        dealService.getDealActivities(id, { limit: 50 }),
      ]);
      set({
        currentDeal:  dealData?.data || dealData,
        payments:     paymentsData?.data || paymentsData || [],
        activities:   activitiesData?.data?.rows || activitiesData?.rows || [],
        detailLoading: false,
      });
    } catch {
      set({ detailLoading: false });
    }
  },

  createDeal: async (data) => {
    const res = await dealService.createDeal(data);
    const deal = res?.data || res;
    set((s) => ({ deals: [deal, ...s.deals] }));
    return deal;
  },

  updateStage: async (id, stage) => {
    await dealService.updateStage(id, stage);
    set((s) => ({
      deals:       s.deals.map((d) => (d.id === id ? { ...d, stage } : d)),
      currentDeal: s.currentDeal?.id === id ? { ...s.currentDeal, stage } : s.currentDeal,
    }));
  },

  deleteDeal: async (id) => {
    await dealService.deleteDeal(id);
    set((s) => ({ deals: s.deals.filter((d) => d.id !== id) }));
  },

  activeFilterCount: () => {
    const { filters } = get();
    return (filters.stage?.length || 0) + (filters.search ? 1 : 0);
  },
}));
