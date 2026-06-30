import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';

export const useAuthStore = create((set, get) => ({
  user:        null,
  token:       null,
  role:        null,
  isLoggedIn:  false,
  isLoading:   false,
  isBootstrapped: false,

  bootstrap: async () => {
    try {
      const stored = await authService.getStoredUser();
      if (stored) {
        set({
          user:       stored.user,
          token:      stored.token,
          role:       stored.user?.role,
          isLoggedIn: true,
        });
      }
    } catch (_) {}
    set({ isBootstrapped: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user, accessToken } = await authService.login(email, password);
      set({
        user,
        token:      accessToken,
        role:       user?.role,
        isLoggedIn: true,
        isLoading:  false,
      });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.message || 'Login failed' };
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, token: null, role: null, isLoggedIn: false });
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

  isAdmin:   () => get().role === 'admin',
  isManager: () => ['admin', 'manager'].includes(get().role),
}));
