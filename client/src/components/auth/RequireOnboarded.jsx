import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'

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
    const allowed = new Set((user.allowedMenus || []).map((m) => m.route).filter(Boolean))
    const pathname = location.pathname
    if (allowed.size > 0 && !allowed.has(pathname)) {
      const fallback = allowed.has('/') ? '/' : [...allowed][0]
      if (fallback) return <Navigate to={fallback} replace />
    }
  }

  return <Outlet />
}
