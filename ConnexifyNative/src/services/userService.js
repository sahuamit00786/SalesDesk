import api from './api';

export const userService = {
  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data.data || response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/team/profile', data);
    return response.data.data || response.data;
  },

  async changePassword(oldPassword, newPassword) {
    const response = await api.post('/auth/change-password', { oldPassword, newPassword });
    return response.data;
  },

  async getTeam(params = {}) {
    const response = await api.get('/team/members', { params });
    return response.data;
  },

  async getMember(id) {
    const response = await api.get(`/team/members/${id}`);
    return response.data.data || response.data;
  },

  async getDashboardStats() {
    const response = await api.get('/analytics/dashboard');
    return response.data.data || response.data;
  },

  async getMyFollowUps(params = {}) {
    const response = await api.get('/leads', {
      params: { followUpDue: true, my: true, limit: 5, ...params },
    });
    return response.data;
  },
};
