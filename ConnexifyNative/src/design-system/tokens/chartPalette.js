// Categorical chart palettes — validated with the dataviz six-checks script:
// light on #FFFFFF and dark on #171220 both PASS (lightness band, chroma floor,
// adjacent-pair CVD ΔE, contrast ≥3:1). Assign in FIXED order, never cycle;
// >6 series folds into "Other". Slot 1 is the validated brand purple and stays
// fixed even when a workspace theme overrides the UI brand color.
export const categoricalLight = ['#6D29D9', '#B45309', '#0284C7', '#BE185D', '#0D9488', '#4338CA'];
export const categoricalDark = ['#8B5CF6', '#D97706', '#0284C7', '#EC4899', '#6366F1', '#0D9488'];

export function categorical(dark) {
  return dark ? categoricalDark : categoricalLight;
}

// Status-keyed charts (lead status distribution) — color follows the entity.
export const leadStatusChartColors = {
  light: {
    new: '#6D29D9',
    contacted: '#B45309',
    qualified: '#64748B',
    proposal: '#0284C7',
    won: '#15803D',
    lost: '#B91C1C',
    junk: '#94A3B8',
  },
  dark: {
    new: '#8B5CF6',
    contacted: '#D97706',
    qualified: '#94A3B8',
    proposal: '#0EA5E9',
    won: '#22C55E',
    lost: '#EF4444',
    junk: '#64748B',
  },
};
