import { lightColors, darkColors } from './colors';

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
};

export const fontWeight = {
  regular: '400',
  medium:  '500',
  semibold:'600',
  bold:    '700',
};

export const borderRadius = {
  xs:   4,
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  fab: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
};

export const animation = {
  fast:   150,
  normal: 250,
  slow:   400,
  spring: {
    damping: 15,
    stiffness: 200,
    mass: 0.8,
  },
};

export const zIndex = {
  base:       1,
  card:       10,
  fab:        50,
  modal:      100,
  bottomSheet:200,
  toast:      999,
};

const buildTheme = (colors) => ({
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  animation,
  zIndex,
});

export const lightTheme = buildTheme(lightColors);
export const darkTheme  = buildTheme(darkColors);

export { lightColors, darkColors };
