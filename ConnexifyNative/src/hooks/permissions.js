import { useMemo } from 'react';
import { useAuthStore, isCompanyAdmin, isManagerOrAdmin } from '../stores/authStore';

// Ports of web client/src/utils/menuAccess.js + client/src/features/hr/useHrRole.js.
// Mobile screens are keyed by their web menu route (see navigation/routes.js).

export function normalizeMenuRoute(route) {
  if (!route || typeof route !== 'string') return null;
  const trimmed = route.trim();
  if (!trimmed) return null;
  if (trimmed === '/') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** null = company admin (everything allowed); else Set of allowed menu routes. */
export function buildAllowedRouteSet(allowedMenus, { admin = false } = {}) {
  if (admin) return null;
  const allowed = new Set();
  for (const m of allowedMenus || []) {
    const route = normalizeMenuRoute(m?.route);
    if (route) allowed.add(route);
  }
  allowed.add('/');
  allowed.add('/dashboard');
  return allowed;
}

export function isMenuRouteAllowed(menuRoute, allowedRoutes) {
  if (!allowedRoutes) return true; // admin bypass
  const path = normalizeMenuRoute(menuRoute);
  if (!path) return false;
  if (allowedRoutes.has(path)) return true;
  for (const route of allowedRoutes) {
    if (!route || route === '/') continue;
    if (path === route || path.startsWith(`${route}/`)) return true;
  }
  return false;
}

export function useAllowedRoutes() {
  const user = useAuthStore((s) => s.user);
  return useMemo(
    () => buildAllowedRouteSet(user?.allowedMenus, { admin: isCompanyAdmin(user) }),
    [user],
  );
}

/** Can the current user access this web menu route? */
export function useCan(menuRoute) {
  const allowed = useAllowedRoutes();
  return isMenuRouteAllowed(menuRoute, allowed);
}

export function useHrRole() {
  const user = useAuthStore((s) => s.user);
  if (isCompanyAdmin(user)) return 'admin';
  const kind = String(user?.companyRole?.userRoleKind || '').toLowerCase();
  if (kind === 'manager' || kind === 'workspace_admin') return 'manager';
  return 'employee';
}

export function useIsHrManagerOrAdmin() {
  const role = useHrRole();
  return role === 'admin' || role === 'manager';
}

export function useIsAdmin() {
  const user = useAuthStore((s) => s.user);
  return isCompanyAdmin(user);
}

export function useIsManagerOrAdmin() {
  const user = useAuthStore((s) => s.user);
  return isManagerOrAdmin(user);
}
