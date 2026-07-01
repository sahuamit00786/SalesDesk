import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useUIStore = create((set, get) => ({
  darkMode:       null,   // null = follow system
  globalLoader:   false,
  toasts:         [],

  initDarkMode: async () => {
    const saved = await AsyncStorage.getItem('darkMode');
    if (saved !== null) set({ darkMode: saved === 'true' });
  },

  setDarkMode: async (value) => {
    set({ darkMode: value });
    await AsyncStorage.setItem('darkMode', String(value));
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    get().setDarkMode(next);
  },

  showLoader:  () => set({ globalLoader: true }),
  hideLoader:  () => set({ globalLoader: false }),

  showToast: (toast) => {
    set((state) => ({ toasts: [...state.toasts, { id: Date.now(), ...toast }] }));
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
