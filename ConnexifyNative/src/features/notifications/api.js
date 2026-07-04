import { get, post, patch } from '../../api/client';

// NOTE: GET /notifications returns counts under `pagination` (not meta) —
// envelope.unwrap merges it into meta. server/src/controllers/notificationController.js
export const notificationsApi = {
  list: (params) => get('/notifications', params),
  unreadCount: () => get('/notifications/unread-count'),
  markRead: (id) => patch(`/notifications/${id}/read`),
  markAllRead: () => post('/notifications/mark-all-read'),
};
