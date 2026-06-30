import { create } from 'zustand';
import { campaignService } from '../services/campaignService';

const PAGE_SIZE = 20;

export const useCampaignStore = create((set, get) => ({
  // ── Campaigns list ────────────────────────────────────────────
  campaigns:       [],
  filters:         { search: '', status: [] },
  isLoading:       false,
  isRefreshing:    false,
  isLoadingMore:   false,
  error:           null,
  page:            1,
  hasMore:         true,

  // ── Active campaign ───────────────────────────────────────────
  currentCampaign:  null,
  campaignLeads:    [],
  leadsLoading:     false,

  // ── Actions ───────────────────────────────────────────────────
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: { search: '', status: [] } }),

  fetchCampaigns: async (reset = false) => {
    const { filters, page, campaigns } = get();
    const newPage = reset ? 1 : page;

    if (reset) {
      set({ isLoading: campaigns.length === 0, isRefreshing: campaigns.length > 0, error: null, page: 1, hasMore: true });
    } else {
      if (!get().hasMore) return;
      set({ isLoadingMore: true });
    }

    try {
      const params = {
        page: newPage,
        limit: PAGE_SIZE,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.status?.length ? { status: filters.status.join(',') } : {}),
      };
      const data = await campaignService.getCampaigns(params);
      const rows = data?.data?.rows || data?.rows || [];
      const total = data?.data?.count ?? data?.count ?? 0;

      set((s) => ({
        campaigns:     reset ? rows : [...s.campaigns, ...rows],
        page:          newPage + 1,
        hasMore:       (reset ? rows.length : s.campaigns.length + rows.length) < total,
        isLoading:     false,
        isRefreshing:  false,
        isLoadingMore: false,
        error:         null,
      }));
    } catch (e) {
      set({ isLoading: false, isRefreshing: false, isLoadingMore: false, error: e?.message || 'Failed to load campaigns' });
    }
  },

  refresh: () => get().fetchCampaigns(true),
  loadMore: () => {
    if (!get().isLoadingMore && get().hasMore) get().fetchCampaigns(false);
  },

  fetchCampaignDetail: async (id) => {
    set({ currentCampaign: null, campaignLeads: [], leadsLoading: true });
    try {
      const [campData, leadsData] = await Promise.all([
        campaignService.getCampaign(id),
        campaignService.getCampaignLeads(id, { limit: 100 }),
      ]);
      const campaign = campData?.data || campData;
      const leads = leadsData?.data?.rows || leadsData?.rows || [];
      set({ currentCampaign: campaign, campaignLeads: leads, leadsLoading: false });
    } catch (e) {
      set({ leadsLoading: false });
    }
  },

  refreshCampaignLeads: async (campaignId) => {
    set({ leadsLoading: true });
    try {
      const data = await campaignService.getCampaignLeads(campaignId, { limit: 100 });
      const leads = data?.data?.rows || data?.rows || [];
      set({ campaignLeads: leads, leadsLoading: false });
    } catch {
      set({ leadsLoading: false });
    }
  },

  addLeadToCampaign: async (campaignId, leadIds) => {
    await campaignService.addLeadToCampaign(campaignId, { leadIds });
    await get().fetchCampaignDetail(campaignId);
  },

  removeLeadFromCampaign: async (campaignId, leadId) => {
    await campaignService.removeLeadFromCampaign(campaignId, leadId);
    set((s) => ({ campaignLeads: s.campaignLeads.filter((l) => l.id !== leadId) }));
  },

  activeFilterCount: () => {
    const { filters } = get();
    return (filters.status?.length || 0) + (filters.search ? 1 : 0);
  },
}));
