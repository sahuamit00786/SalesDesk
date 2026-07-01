import { create } from 'zustand';
import { leadService } from '../services/leadService';

const DEFAULT_FILTERS = {
  search:      '',
  stage:       [],
  priority:    [],
  assignedTo:  [],
  source:      [],
  createdFrom: null,
  createdTo:   null,
  followUpFrom:null,
  followUpTo:  null,
};

const DEFAULT_SORT = { field: 'createdAt', order: 'DESC' };

export const useLeadStore = create((set, get) => ({
  leads:          [],
  currentLead:    null,
  filters:        { ...DEFAULT_FILTERS },
  sort:           { ...DEFAULT_SORT },
  pagination:     { page: 1, limit: 20, total: 0, hasMore: true },
  isLoading:      false,
  isRefreshing:   false,
  isLoadingMore:  false,
  error:          null,

  fetchLeads: async (reset = false) => {
    const { filters, sort, pagination } = get();
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
        sortBy: sort.field,
        sortOrder: sort.order,
        ...(filters.search && { search: filters.search }),
        ...(filters.stage.length && { stage: filters.stage.join(',') }),
        ...(filters.priority.length && { priority: filters.priority.join(',') }),
        ...(filters.assignedTo.length && { assignedTo: filters.assignedTo.join(',') }),
        ...(filters.source.length && { source: filters.source.join(',') }),
        ...(filters.createdFrom && { createdFrom: filters.createdFrom }),
        ...(filters.createdTo && { createdTo: filters.createdTo }),
        ...(filters.followUpFrom && { followUpFrom: filters.followUpFrom }),
        ...(filters.followUpTo && { followUpTo: filters.followUpTo }),
      };

      const data = await leadService.getLeads(params);
      const rows  = data.data?.rows || data.rows || [];
      const total = data.data?.count || data.count || 0;

      set((state) => ({
        leads:         reset ? rows : [...state.leads, ...rows],
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

  fetchLead: async (id) => {
    set({ isLoading: true });
    try {
      const lead = await leadService.getLead(id);
      set({ currentLead: lead, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },

  createLead: async (data) => {
    const lead = await leadService.createLead(data);
    set((state) => ({ leads: [lead, ...state.leads] }));
    return lead;
  },

  updateLead: async (id, data) => {
    const updated = await leadService.updateLead(id, data);
    set((state) => ({
      leads: state.leads.map((l) => l.id === id ? updated : l),
      currentLead: state.currentLead?.id === id ? updated : state.currentLead,
    }));
    return updated;
  },

  deleteLead: async (id) => {
    await leadService.deleteLead(id);
    set((state) => ({ leads: state.leads.filter((l) => l.id !== id) }));
  },

  updateStage: async (id, stage) => {
    const updated = await leadService.updateStage(id, stage);
    set((state) => ({
      leads: state.leads.map((l) => l.id === id ? updated : l),
      currentLead: state.currentLead?.id === id ? updated : state.currentLead,
    }));
    return updated;
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
  },

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  setSort: (sort) => set({ sort }),

  refresh: async () => {
    set({ isRefreshing: true });
    await get().fetchLeads(true);
  },

  loadMore: async () => {
    const { isLoadingMore, pagination } = get();
    if (!isLoadingMore && pagination.hasMore) {
      await get().fetchLeads(false);
    }
  },

  activeFilterCount: () => {
    const f = get().filters;
    let count = 0;
    if (f.stage.length)       count++;
    if (f.priority.length)    count++;
    if (f.assignedTo.length)  count++;
    if (f.source.length)      count++;
    if (f.createdFrom || f.createdTo) count++;
    if (f.followUpFrom || f.followUpTo) count++;
    return count;
  },
}));
