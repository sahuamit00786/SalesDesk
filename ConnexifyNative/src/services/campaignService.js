import api from './api';

export const campaignService = {
  // ── Campaigns ─────────────────────────────────────────────────
  getCampaigns: (params = {}) => api.get('/campaigns', { params }).then((r) => r.data),
  getCampaign:  (id)         => api.get(`/campaigns/${id}`).then((r) => r.data),
  createCampaign: (body)     => api.post('/campaigns', body).then((r) => r.data),
  updateCampaign: (id, body) => api.patch(`/campaigns/${id}`, body).then((r) => r.data),

  // ── Campaign Leads ────────────────────────────────────────────
  getCampaignLeads: (campaignId, params = {}) =>
    api.get(`/campaigns/${campaignId}/leads`, { params }).then((r) => r.data),
  addLeadToCampaign: (campaignId, body) =>
    api.post(`/campaigns/${campaignId}/leads`, body).then((r) => r.data),
  removeLeadFromCampaign: (campaignId, leadId) =>
    api.delete(`/campaigns/${campaignId}/leads/${leadId}`).then((r) => r.data),
  updateCampaignLeadAmount: (campaignId, leadId, amountReceived) =>
    api.patch(`/campaigns/${campaignId}/leads/${leadId}`, { amountReceived }).then((r) => r.data),

  // ── Campaign Payments ─────────────────────────────────────────
  getPayments: (campaignId, leadId) =>
    api.get(`/campaigns/${campaignId}/leads/${leadId}/payments`).then((r) => r.data),
  createPayment: (campaignId, leadId, body) =>
    api.post(`/campaigns/${campaignId}/leads/${leadId}/payments`, body).then((r) => r.data),
  updatePayment: (campaignId, leadId, paymentId, body) =>
    api.patch(`/campaigns/${campaignId}/leads/${leadId}/payments/${paymentId}`, body).then((r) => r.data),
  deletePayment: (campaignId, leadId, paymentId) =>
    api.delete(`/campaigns/${campaignId}/leads/${leadId}/payments/${paymentId}`).then((r) => r.data),
};
