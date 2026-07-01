import api from './api';

export const notificationService = {
  getNotifications: (params = {}) =>
    api.get('/notifications', { params }).then((r) => r.data),

  getUnreadCount: () =>
    api.get('/notifications/unread-count').then((r) => r.data),

  markRead: (id) =>
    api.post(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.post('/notifications/mark-all-read').then((r) => r.data),
};
