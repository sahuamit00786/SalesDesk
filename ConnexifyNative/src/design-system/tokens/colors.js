// Web parity: client/tailwind.config.js + client/src/index.css + useWorkspaceTheme.js
export const BRAND_DEFAULT = '#6D29D9';

export const semantic = {
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0E7490',
};

export const lightSurfaces = {
  page: '#F9F7FC',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  inputBg: '#FFFFFF',
  ink: '#0F1117',
  inkMuted: '#4B5263',
  inkFaint: '#8B93A8',
  divider: '#EFEAF6',
  overlay: 'rgba(15, 17, 23, 0.45)',
  skeleton: '#ECE7F3',
  skeletonHighlight: '#F7F4FB',
  successSoft: '#F0FDF4',
  warningSoft: '#FFFBEB',
  dangerSoft: '#FEF2F2',
  infoSoft: '#ECFEFF',
  white: '#FFFFFF',
};

export const darkSurfaces = {
  page: '#0E0B15',
  card: '#171220',
  cardElevated: '#1E182B',
  inputBg: '#1A1425',
  ink: '#F4F2F9',
  inkMuted: '#A9A3BB',
  inkFaint: '#6E6883',
  divider: '#251E33',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#221B31',
  skeletonHighlight: '#2C2440',
  successSoft: 'rgba(22, 163, 74, 0.16)',
  warningSoft: 'rgba(217, 119, 6, 0.16)',
  dangerSoft: 'rgba(220, 38, 38, 0.16)',
  infoSoft: 'rgba(14, 116, 144, 0.18)',
  white: '#FFFFFF',
};

// Lead status styles — web client/src/features/leads/constants.js STATUS_STYLES
// (brand-dependent entries resolved in ThemeProvider)
export const staticStatusStyles = {
  light: {
    contacted: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    proposal: { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
    won: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    lost: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    junk: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
  },
  dark: {
    contacted: { bg: 'rgba(217, 119, 6, 0.16)', text: '#FBBF24', border: 'rgba(217, 119, 6, 0.35)' },
    proposal: { bg: 'rgba(14, 116, 144, 0.18)', text: '#22D3EE', border: 'rgba(14, 116, 144, 0.4)' },
    won: { bg: 'rgba(22, 163, 74, 0.16)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    lost: { bg: 'rgba(220, 38, 38, 0.16)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    junk: { bg: 'rgba(107, 114, 128, 0.16)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.35)' },
  },
};
