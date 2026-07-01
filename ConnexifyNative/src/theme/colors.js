export const palette = {
  indigo50:  '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo800: '#3730A3',
  indigo900: '#312E81',

  cyan500: '#06B6D4',
  cyan600: '#0891B2',

  emerald500: '#10B981',
  emerald600: '#059669',

  amber500: '#F59E0B',
  amber600: '#D97706',

  red400:  '#F87171',
  red500:  '#EF4444',
  red600:  '#DC2626',

  slate50:  '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  white: '#FFFFFF',
  black: '#000000',

  transparent: 'transparent',
};

export const lightColors = {
  primary:        palette.indigo600,
  primaryDark:    palette.indigo800,
  primaryLight:   palette.indigo50,
  primaryMid:     palette.indigo100,
  accent:         palette.cyan500,
  accentDark:     palette.cyan600,

  success:        palette.emerald500,
  successDark:    palette.emerald600,
  successBg:      '#D1FAE5',

  warning:        palette.amber500,
  warningDark:    palette.amber600,
  warningBg:      '#FEF3C7',

  danger:         palette.red500,
  dangerDark:     palette.red600,
  dangerBg:       '#FEE2E2',

  background:     palette.slate50,
  surface:        palette.white,
  surfaceAlt:     palette.slate100,
  border:         palette.slate200,
  borderLight:    palette.slate100,
  borderStrong:   palette.slate300,

  textPrimary:    palette.slate900,
  textSecondary:  palette.slate500,
  textMuted:      palette.slate400,
  textInverse:    palette.white,

  // Stage colors
  stageNew:       '#8B5CF6',
  stageContacted: '#3B82F6',
  stageInterested:'#06B6D4',
  stageFollowUp:  '#F59E0B',
  stageConverted: '#10B981',
  stageLost:      '#EF4444',

  // Priority
  priorityHigh:   palette.red500,
  priorityMedium: palette.amber500,
  priorityLow:    palette.emerald500,

  // Attendance
  attendancePresent: palette.emerald500,
  attendanceAbsent:  palette.red500,
  attendanceLate:    palette.amber500,
  attendanceLeave:   palette.cyan500,

  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowMedium: 'rgba(0, 0, 0, 0.14)',
  shadowStrong: 'rgba(0, 0, 0, 0.22)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const darkColors = {
  primary:        palette.indigo600,
  primaryDark:    palette.indigo700,
  primaryLight:   '#1E1B4B',
  primaryMid:     '#2D2A5E',
  accent:         palette.cyan500,
  accentDark:     palette.cyan600,

  success:        palette.emerald500,
  successDark:    palette.emerald600,
  successBg:      '#064E3B',

  warning:        palette.amber500,
  warningDark:    palette.amber600,
  warningBg:      '#78350F',

  danger:         palette.red400,
  dangerDark:     palette.red500,
  dangerBg:       '#7F1D1D',

  background:     '#0B1120',
  surface:        '#151F32',
  surfaceAlt:     '#1A2540',
  border:         '#253352',
  borderLight:    '#1D2B45',
  borderStrong:   '#2E4070',

  textPrimary:    '#F1F5F9',
  textSecondary:  '#94A3B8',
  textMuted:      '#64748B',
  textInverse:    palette.slate900,

  stageNew:       '#A78BFA',
  stageContacted: '#60A5FA',
  stageInterested:'#22D3EE',
  stageFollowUp:  '#FCD34D',
  stageConverted: '#34D399',
  stageLost:      '#F87171',

  priorityHigh:   palette.red400,
  priorityMedium: palette.amber500,
  priorityLow:    palette.emerald500,

  attendancePresent: palette.emerald500,
  attendanceAbsent:  palette.red400,
  attendanceLate:    palette.amber500,
  attendanceLeave:   palette.cyan500,

  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  shadowStrong: 'rgba(0, 0, 0, 0.6)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

export const stageColorMap = {
  New:        { light: lightColors.stageNew,        dark: darkColors.stageNew },
  Contacted:  { light: lightColors.stageContacted,  dark: darkColors.stageContacted },
  Interested: { light: lightColors.stageInterested, dark: darkColors.stageInterested },
  'Follow-up':{ light: lightColors.stageFollowUp,   dark: darkColors.stageFollowUp },
  Converted:  { light: lightColors.stageConverted,  dark: darkColors.stageConverted },
  Lost:       { light: lightColors.stageLost,        dark: darkColors.stageLost },
};

export const priorityColorMap = {
  High:   { bg: '#FEE2E2', text: '#DC2626' },
  Medium: { bg: '#FEF3C7', text: '#D97706' },
  Low:    { bg: '#D1FAE5', text: '#059669' },
};
