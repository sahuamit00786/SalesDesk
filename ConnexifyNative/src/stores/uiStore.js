import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCHEME_KEY = 'connexify.colorScheme';
const BIO_KEY = 'connexify.biometricEnabled';

export const useUiStore = create((set) => ({
  colorScheme: 'system', // 'system' | 'light' | 'dark'
  biometricEnabled: false,
  unlocked: false, // per-session biometric gate state (never persisted)
  hydrated: false,

  setUnlocked: (unlocked) => set({ unlocked }),

  hydrate: async () => {
    try {
      const [[, scheme], [, bio], [, legacyDark]] = await AsyncStorage.multiGet([
        SCHEME_KEY,
        BIO_KEY,
        'darkMode', // pre-rebuild preference
      ]);
      let colorScheme = scheme;
      if (!colorScheme && legacyDark !== null) colorScheme = legacyDark === 'true' ? 'dark' : 'light';
      set({
        colorScheme: colorScheme || 'system',
        biometricEnabled: bio === 'true',
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  setColorScheme: async (colorScheme) => {
    set({ colorScheme });
    try {
      await AsyncStorage.setItem(SCHEME_KEY, colorScheme);
      // keep legacy screens' theme in sync until final cleanup
      if (colorScheme === 'system') await AsyncStorage.removeItem('darkMode');
      else await AsyncStorage.setItem('darkMode', String(colorScheme === 'dark'));
    } catch {}
  },

  setBiometricEnabled: async (enabled) => {
    set({ biometricEnabled: enabled });
    try {
      await AsyncStorage.setItem(BIO_KEY, String(enabled));
    } catch {}
  },
}));
