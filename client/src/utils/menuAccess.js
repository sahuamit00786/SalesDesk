import { NAV_SECTIONS } from '@/components/layout/navConfig'
import { DASHBOARD_PATH, menuRouteFromPathname } from '@/constants/appRoutes'
import { COMPANY_USER_ROLE_KIND } from '@/constants/companyUserRoleKind'

/** Company admin, workspace_admin, and manager see every sidebar menu; everyone else gets
 * the fixed `restricted: true` subset from NAV_SECTIONS (see navConfig.js). */
export function isElevatedRole(user) {
  if (!user) return false
  if (user.isCompanyAdmin) return true
  const kind = user.companyRole?.userRoleKind
  return kind === COMPANY_USER_ROLE_KIND.WORKSPACE_ADMIN || kind === COMPANY_USER_ROLE_KIND.MANAGER
}

/** Normalize menu route values from nav config. */
export function normalizeMenuRoute(route) {
  if (!route || typeof route !== 'string') return null
  const trimmed = route.trim()
  if (!trimmed) return null
  if (trimmed === '/') return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Build the Set of routes `user` may access. Returns `null` for elevated roles (meaning
 * "everything allowed"); otherwise the fixed set of `restricted: true` NAV_SECTIONS routes,
 * plus the personal profile page (never role-gated).
 */
export function buildAllowedRouteSet(user) {
  if (isElevatedRole(user)) return null
  const allowed = new Set()
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (!item.restricted) continue
      const route = normalizeMenuRoute(item.to)
      if (route) allowed.add(route)
    }
  }
  allowed.add('/')
  allowed.add(DASHBOARD_PATH)
  allowed.add('/my-profile')
  return allowed
}

/** Whether the current pathname is allowed for this user's route set. */
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
