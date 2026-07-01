import api from './api';

export const leaveService = {
  getLeaveTypes: () =>
    api.get('/leave/types').then((r) => r.data),

  getMyBalance: () =>
    api.get('/leave/balance/me').then((r) => r.data),

  getMyRequests: (params = {}) =>
    api.get('/leave/requests/me', { params }).then((r) => r.data),

  getAllRequests: (params = {}) =>
    api.get('/leave/requests/all', { params }).then((r) => r.data),

  getPendingApprovals: () =>
    api.get('/leave/pending-approvals').then((r) => r.data),

  applyLeave: (data) =>
    api.post('/leave/requests', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }).then((r) => r.data),

  approveLeave: (id) =>
    api.post(`/leave/requests/${id}/approve`).then((r) => r.data),

  rejectLeave: (id, reason) =>
    api.post(`/leave/requests/${id}/reject`, { reason }).then((r) => r.data),

  cancelLeave: (id) =>
    api.post(`/leave/requests/${id}/cancel`).then((r) => r.data),

  getHolidays: () =>
    api.get('/leave/holidays').then((r) => r.data),

  previewDays: (params) =>
    api.get('/leave/preview-days', { params }).then((r) => r.data),
};
