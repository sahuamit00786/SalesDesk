/** Authenticated CRM home (public marketing lives at `/`). */
export const DASHBOARD_PATH = '/dashboard'

/** Map app pathname to menu_master `route` from API (dashboard is `/` in DB). */
export function menuRouteFromPathname(pathname) {
  if (pathname === DASHBOARD_PATH) return '/'
  return pathname
}

/** Map API menu route to in-app path. */
export function appPathFromMenuRoute(route) {
  if (route === '/') return DASHBOARD_PATH
  return route
}
