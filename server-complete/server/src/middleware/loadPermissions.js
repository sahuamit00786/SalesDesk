import { User } from '../models/index.js'
import { loadPermissionSetForUser } from '../services/permissionService.js'

/**
 * Loads `req.permissionSet` (Set of `resource:action`) for the authenticated user.
 * Permissions are per-user (UserMenuPermission), not role-scoped. Re-fetches isCompanyAdmin
 * fresh from the User row rather than trusting the JWT claim (cached up to
 * JWT_ACCESS_EXPIRES) so an admin-status change takes effect on the very next request
 * instead of waiting for token refresh. This is a single indexed PK lookup, cheap relative
 * to the UserMenuPermission query this middleware already performs.
 */
export async function loadPermissions(req, res, next) {
  try {
    let isCompanyAdmin = Boolean(req.user?.isCompanyAdmin)
    const userId = req.user?.id ?? null

    if (userId) {
      const fresh = await User.findByPk(userId, { attributes: ['isCompanyAdmin'] })
      if (fresh) isCompanyAdmin = Boolean(fresh.isCompanyAdmin)
    }

    req.permissionSet = await loadPermissionSetForUser({ isCompanyAdmin, userId })
    return next()
  } catch (e) {
    return next(e)
  }
}
