// Exact port of web client/src/hooks/useWorkspaceTheme.js darkenHex
export function darkenHex(hex, amount = 18) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#4c1d95';
  const n = parseInt(clean, 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** #RRGGBB + 0..1 alpha → #RRGGBBAA (falls back to input when not 6-digit hex). */
export function hexAlpha(hex, alpha) {
  const clean = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean}${a}`;
}
