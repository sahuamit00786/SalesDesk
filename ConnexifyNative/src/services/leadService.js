import api from './api';

export const leadService = {
  async getLeads(params = {}) {
    const response = await api.get('/leads', { params });
    return response.data;
  },

  async getLead(id) {
    const response = await api.get(`/leads/${id}`);
    return response.data.data || response.data;
  },

  async createLead(data) {
    const response = await api.post('/leads', data);
    return response.data.data || response.data;
  },

  async updateLead(id, data) {
    const response = await api.put(`/leads/${id}`, data);
    return response.data.data || response.data;
  },

  async deleteLead(id) {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  async updateStage(id, stage) {
    const response = await api.patch(`/leads/${id}/stage`, { stage });
    return response.data.data || response.data;
  },

  async updatePriority(id, priority) {
    const response = await api.patch(`/leads/${id}`, { priority });
    return response.data.data || response.data;
  },

  async getLeadActivities(id, params = {}) {
    const response = await api.get(`/leads/${id}/activities`, { params });
    return response.data;
  },
};
