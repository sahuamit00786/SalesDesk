import { User } from '../models/index.js'
import { loadPermissionSetForUser } from '../services/permissionService.js'
import { resolveListWorkspaceFilterId } from '../utils/resolveListWorkspaceFilter.js'

/**
 * Loads `req.permissionSet` (Set of `resource:action`) for the authenticated user.
 * Permissions are per-user (UserMenuPermission), optionally overridden per workspace.
 * Re-fetches isCompanyAdmin fresh from the User row rather than trusting the JWT claim
 * (cached up to JWT_ACCESS_EXPIRES) so an admin-status change takes effect on the very
 * next request instead of waiting for token refresh. This is a single indexed PK lookup,
 * cheap relative to the UserMenuPermission query this middleware already performs.
 *
 * Uses the SOFT `resolveListWorkspaceFilterId` (query param or x-workspace-id header,
 * never throws) rather than `req.workspaceId` set by the `workspaceContext` middleware —
 * that middleware throws 400 when the header is missing and isn't wired on every route
 * (e.g. the /team/* management routes), so depending on it here would require touching
 * every route registration in the app. The soft resolver works uniformly everywhere.
 */
export async function loadPermissions(req, res, next) {
  try {
    let isCompanyAdmin = Boolean(req.user?.isCompanyAdmin)
    const userId = req.user?.id ?? null

    if (userId) {
      const fresh = await User.findByPk(userId, { attributes: ['isCompanyAdmin'] })
      if (fresh) isCompanyAdmin = Boolean(fresh.isCompanyAdmin)
    }

    const workspaceId = resolveListWorkspaceFilterId(req) || undefined
    req.permissionSet = await loadPermissionSetForUser({ isCompanyAdmin, userId, workspaceId })
    return next()
  } catch (e) {
    return next(e)
  }
}
