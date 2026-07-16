import { User, CompanyRole } from '../models/index.js'
import { loadPermissionSetForUser } from '../services/permissionService.js'

/**
 * Loads `req.permissionSet` (Set of `resource:action`) for the authenticated user.
 * Permissions are per-user (UserMenuPermission), not role-scoped.
 *
 * SECURITY: re-fetches isCompanyAdmin AND userRoleKind fresh from the DB rather
 * than trusting the JWT claims (cached up to JWT_ACCESS_EXPIRES). userRoleKind
 * drives ALL data visibility (leadAccessWhere / isElevated) and the role
 * hierarchy checks, so a demotion must take effect on the very next request —
 * not when the token happens to refresh. This is a single indexed PK lookup
 * with one joined role row, cheap relative to the UserMenuPermission query
 * this middleware already performs.
 */
export async function loadPermissions(req, res, next) {
  try {
    let isCompanyAdmin = Boolean(req.user?.isCompanyAdmin)
    const userId = req.user?.id ?? null

    if (userId) {
      const fresh = await User.findByPk(userId, {
        attributes: ['isCompanyAdmin', 'companyRoleId'],
        include: [{ model: CompanyRole, as: 'companyRole', attributes: ['userRoleKind', 'roleNo'] }],
      })
      if (fresh) {
        isCompanyAdmin = Boolean(fresh.isCompanyAdmin)
        req.user.isCompanyAdmin = isCompanyAdmin
        req.user.companyRoleId = fresh.companyRoleId ?? null
        req.user.userRoleKind = fresh.companyRole?.userRoleKind ?? null
        req.user.roleNo = fresh.companyRole?.roleNo != null ? Number(fresh.companyRole.roleNo) : null
      }
    }

    req.permissionSet = await loadPermissionSetForUser({ isCompanyAdmin, userId })
    return next()
  } catch (e) {
    return next(e)
  }
}
