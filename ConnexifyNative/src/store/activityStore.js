import { create } from 'zustand';
import { activityService } from '../services/activityService';

const DEFAULT_FILTERS = {
  search:      '',
  type:        [],
  assignedTo:  [],
  dateFrom:    null,
  dateTo:      null,
  leadStage:   [],
};

export const useActivityStore = create((set, get) => ({
  activities:    [],
  filters:       { ...DEFAULT_FILTERS },
  pagination:    { page: 1, limit: 20, total: 0, hasMore: true },
  isLoading:     false,
  isRefreshing:  false,
  isLoadingMore: false,
  error:         null,

  fetchActivities: async (reset = false) => {
    const { filters, pagination } = get();
    if (reset) {
      set({ isLoading: true, error: null, pagination: { ...pagination, page: 1, hasMore: true } });
    } else {
      if (!pagination.hasMore) return;
      set({ isLoadingMore: true });
    }

    const page = reset ? 1 : pagination.page;

    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.type.length && { type: filters.type.join(',') }),
        ...(filters.assignedTo.length && { assignedTo: filters.assignedTo.join(',') }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.leadStage.length && { leadStage: filters.leadStage.join(',') }),
      };

      const data = await activityService.getActivities(params);
      const rows  = data.data?.rows || data.rows || [];
      const total = data.data?.count || data.count || 0;

      set((state) => ({
        activities:    reset ? rows : [...state.activities, ...rows],
        pagination: {
          ...state.pagination,
          page:    page + 1,
          total,
          hasMore: rows.length === pagination.limit,
        },
        isLoading:     false,
        isRefreshing:  false,
        isLoadingMore: false,
        error:         null,
      }));
    } catch (err) {
      set({ isLoading: false, isRefreshing: false, isLoadingMore: false, error: err.message });
    }
  },

  createActivity: async (data) => {
    const activity = await activityService.createActivity(data);
    set((state) => ({ activities: [activity, ...state.activities] }));
    return activity;
  },

  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  refresh: async () => {
    set({ isRefreshing: true });
    await get().fetchActivities(true);
  },

  loadMore: async () => {
    const { isLoadingMore, pagination } = get();
    if (!isLoadingMore && pagination.hasMore) {
      await get().fetchActivities(false);
    }
  },

  activeFilterCount: () => {
    const f = get().filters;
    let count = 0;
    if (f.type.length)       count++;
    if (f.assignedTo.length) count++;
    if (f.dateFrom || f.dateTo) count++;
    if (f.leadStage.length)  count++;
    return count;
  },
}));
