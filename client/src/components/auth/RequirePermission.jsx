import { usePermission } from '@/hooks/usePermission'

/**
 * Hides children unless the current user's role grants `action` on `menu`.
 * Backend enforcement (requirePermission middleware) is authoritative regardless — this
 * only controls whether the button/action is shown, so a hidden action never represents
 * a security boundary on its own.
 *
 * @param {string} menu menu_master key, e.g. 'manage.quotations'
 * @param {'view'|'create'|'update'|'delete'} action
 */
export function RequirePermission({ menu, action, children, fallback = null }) {
  const allowed = usePermission(menu, action)
  return allowed ? children : fallback
}
