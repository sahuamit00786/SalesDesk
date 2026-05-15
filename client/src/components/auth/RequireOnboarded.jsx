import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { appPathFromMenuRoute, DASHBOARD_PATH } from '@/constants/appRoutes'
import { buildAllowedRouteSet, isMenuPathAllowed } from '@/utils/menuAccess'

/**
 * Sends users with incomplete company onboarding to `/onboarding`.
 * Nest inside `RequireAuth` after the onboarding route.
 */
export function RequireOnboarded() {
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()

  if (user?.needsOnboarding) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />
  }

  if (user && !user.isCompanyAdmin) {
    const pathname = location.pathname
    if (pathname === DASHBOARD_PATH) {
      return <Outlet />
    }
    const allowed = buildAllowedRouteSet(user.allowedMenus)
    if (allowed && allowed.size > 0 && !isMenuPathAllowed(pathname, allowed)) {
      const fallbackMenu = allowed.has('/') ? '/' : [...allowed][0]
      const fallback = appPathFromMenuRoute(fallbackMenu)
      if (fallback) return <Navigate to={fallback} replace />
    }
  }

  return <Outlet />
}
