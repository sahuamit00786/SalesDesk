import { create } from 'zustand';
import { AppState } from 'react-native';
import { notificationService } from '../services/notificationService';

let pollInterval = null;

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  isLoading:     false,
  page:          1,
  hasMore:       true,

  fetchNotifications: async (reset = false) => {
    const { page } = get();
    const newPage  = reset ? 1 : page;
    if (reset) set({ isLoading: true, page: 1, hasMore: true });

    try {
      const data = await notificationService.getNotifications({ page: newPage, limit: 30 });
      const rows  = data?.data?.rows || data?.rows || [];
      const total = data?.data?.count ?? data?.count ?? 0;

      set((s) => ({
        notifications: reset ? rows : [...s.notifications, ...rows],
        page:          newPage + 1,
        hasMore:       (reset ? rows.length : s.notifications.length + rows.length) < total,
        isLoading:     false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const data = await notificationService.getUnreadCount();
      set({ unreadCount: data?.data?.count ?? data?.count ?? 0 });
    } catch {}
  },

  markRead: async (id) => {
    await notificationService.markRead(id);
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
      unreadCount:   Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationService.markAllRead();
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount:   0,
    }));
  },

  startPolling: () => {
    get().fetchUnreadCount();
    pollInterval = setInterval(() => {
      if (AppState.currentState === 'active') {
        get().fetchUnreadCount();
      }
    }, 60000);
  },

  stopPolling: () => {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  },

  refresh: () => get().fetchNotifications(true),
}));
