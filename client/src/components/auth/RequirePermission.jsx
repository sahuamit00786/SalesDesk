/**
 * Historically hid children unless the user's role granted `action` on `menu`. Per-action
 * grants no longer exist (see hooks/usePermission.js) — kept as a pass-through component so
 * existing call sites don't need to be touched.
 */
export function RequirePermission({ children }) {
  return children
}
