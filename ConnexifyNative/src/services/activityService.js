import api from './api';

export const activityService = {
  async getActivities(params = {}) {
    const response = await api.get('/activities', { params });
    return response.data;
  },

  async createActivity(data) {
    const response = await api.post('/activities', data);
    return response.data.data || response.data;
  },

  async updateActivity(id, data) {
    const response = await api.put(`/activities/${id}`, data);
    return response.data.data || response.data;
  },

  async deleteActivity(id) {
    const response = await api.delete(`/activities/${id}`);
    return response.data;
  },

  async getMyActivitiesToday() {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get('/activities', {
      params: { dateFrom: today, dateTo: today, my: true, limit: 50 },
    });
    return response.data;
  },
};
