import { DASHBOARD_PATH, menuRouteFromPathname } from '@/constants/appRoutes'

/**
 * Whether a logged-in user has at least one real (non-synthetic) menu grant, or is a
 * company admin. `allowedMenus` always carries a synthetic dashboard-only fallback entry
 * (see withDashboardMenuAlways in userSerializer.js), so checking array length alone is
 * never a valid "has permissions" test.
 */
export function hasRealMenuAccess(user) {
  if (!user) return false
  if (user.isCompanyAdmin) return true
  const menus = Array.isArray(user.allowedMenus) ? user.allowedMenus : []
  return menus.some((m) => !m?.synthetic && (m.canView || m.canCreate || m.canUpdate || m.canDelete))
}

/** Normalize menu route values from API / nav config. */
export function normalizeMenuRoute(route) {
  if (!route || typeof route !== 'string') return null
  const trimmed = route.trim()
  if (!trimmed) return null
  if (trimmed === '/') return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** Build a Set of allowed menu routes (includes `/dashboard` alias for `/`). */
export function buildAllowedRouteSet(allowedMenus, { isCompanyAdmin = false } = {}) {
  if (isCompanyAdmin) return null
  const allowed = new Set()
  for (const m of allowedMenus || []) {
    const route = normalizeMenuRoute(m?.route)
    if (route) allowed.add(route)
  }
  allowed.add('/')
  allowed.add(DASHBOARD_PATH)
  // The Knowledge Base is a help resource, not a permission-gated feature — every
  // authenticated user can open it regardless of their menu permission matrix.
  allowed.add('/knowledge-base')
  // The topbar "Profile" link always points at the viewer's own personal page, not the
  // Team & roles admin feature, so it's exempt from the Team menu grant the same way.
  allowed.add('/my-profile')
  return allowed
}

/** Whether the current pathname is allowed for this user's menu matrix. */
export function isMenuPathAllowed(pathname, allowedRoutes) {
  if (!allowedRoutes) return true
  const menuPath = menuRouteFromPathname(pathname)
  if (allowedRoutes.has(menuPath) || allowedRoutes.has(pathname)) return true
  for (const route of allowedRoutes) {
    if (!route || route === '/') continue
    if (menuPath === route || menuPath.startsWith(`${route}/`)) return true
  }
  return false
}
