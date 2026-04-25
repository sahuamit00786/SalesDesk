import { loadPermissionSetForUser } from '../services/permissionService.js'

/** Loads `req.permissionSet` (Set of `resource:action`) for the authenticated user's role. */
export async function loadPermissions(req, res, next) {
  try {
    req.permissionSet = await loadPermissionSetForUser({
      isCompanyAdmin: Boolean(req.user?.isCompanyAdmin),
      companyRoleId: req.user?.companyRoleId ?? null,
    })
    return next()
  } catch (e) {
    return next(e)
  }
}
