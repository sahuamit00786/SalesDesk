import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore, resolveActiveWorkspace, effectiveCurrency } from '../stores/workspaceStore';
import { darkenHex, hexAlpha } from '../utils/darkenHex';
import { BRAND_DEFAULT, semantic, lightSurfaces, darkSurfaces, staticStatusStyles } from './tokens/colors';
import { fonts, typeScale } from './tokens/typography';
import { spacing, radius } from './tokens/spacing';
import { elevationPresets } from './tokens/elevation';
import { durations, springs, listStagger } from './tokens/motion';

const ThemeContext = createContext(null);

export function buildTheme({ mode, brandColor, onBrandColor, currency }) {
  const dark = mode === 'dark';
  const surfaces = dark ? darkSurfaces : lightSurfaces;
  const brand = /^#[0-9a-fA-F]{6}$/.test(brandColor || '') ? brandColor : BRAND_DEFAULT;
  const brandSoft = hexAlpha(brand, dark ? 0.2 : 0.1);
  const brandFaint = hexAlpha(brand, dark ? 0.12 : 0.06);

  return {
    mode,
    dark,
    currency,
    brand,
    brandDark: darkenHex(brand, 18),
    brandSoft,
    brandFaint,
    onBrand: onBrandColor || '#FFFFFF',
    colors: {
      ...semantic,
      ...surfaces,
      border: dark ? 'rgba(255,255,255,0.09)' : hexAlpha(brand, 0.16),
      borderStrong: dark ? 'rgba(255,255,255,0.16)' : hexAlpha(brand, 0.3),
    },
    statusStyles: {
      new: { bg: brandSoft, text: dark ? hexAlpha('#FFFFFF', 0.92) : brand, border: hexAlpha(brand, 0.3) },
      qualified: { bg: dark ? 'rgba(148,163,184,0.14)' : '#F8FAFC', text: dark ? '#CBD5E1' : brand, border: dark ? 'rgba(148,163,184,0.3)' : hexAlpha(brand, 0.25) },
      ...staticStatusStyles[dark ? 'dark' : 'light'],
    },
    fonts,
    type: typeScale,
    spacing,
    radius,
    elevation: elevationPresets,
    motion: { durations, springs, listStagger },
  };
}

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const colorScheme = useUiStore((s) => s.colorScheme);
  const user = useAuthStore((s) => s.user);
  const preferredId = useWorkspaceStore((s) => s.preferredId);

  const mode = colorScheme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : colorScheme;
  const workspace = resolveActiveWorkspace(user, preferredId);
  const currency = effectiveCurrency(user, preferredId);

  const theme = useMemo(
    () =>
      buildTheme({
        mode,
        brandColor: workspace?.themeColor,
        onBrandColor: workspace?.sidebarTextColor,
        currency,
      }),
    [mode, workspace?.themeColor, workspace?.sidebarTextColor, currency],
  );

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.page}
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
