import api from './api';

export const attendanceService = {
  async checkIn(coords) {
    const response = await api.post('/attendance/check-in', {
      latitude:  coords?.latitude,
      longitude: coords?.longitude,
    });
    return response.data.data || response.data;
  },

  async checkOut(coords) {
    const response = await api.post('/attendance/check-out', {
      latitude:  coords?.latitude,
      longitude: coords?.longitude,
    });
    return response.data.data || response.data;
  },

  async getMyAttendance(params = {}) {
    const response = await api.get('/attendance/me', { params });
    return response.data;
  },

  async getTodayStatus() {
    const response = await api.get('/attendance/today');
    return response.data.data || response.data;
  },

  async getTeamAttendance(params = {}) {
    const response = await api.get('/attendance/team', { params });
    return response.data;
  },

  async getMemberAttendance(userId, params = {}) {
    const response = await api.get(`/attendance/member/${userId}`, { params });
    return response.data;
  },
};
