import { HR_ROLES, isHrAdmin, isHrManagerOrAdmin, resolveHrRole } from '../services/hrRoleService.js'

const ROLE_HIERARCHY = {
  [HR_ROLES.EMPLOYEE]: 0,
  [HR_ROLES.MANAGER]: 1,
  [HR_ROLES.ADMIN]: 2,
}

/**
 * Express middleware that checks the caller's HR role meets minRole.
 * minRole: 'employee' | 'manager' | 'admin'
 * Requires requireAuth + requireCompany to have run first (req.user populated).
 */
export function requireHrRole(minRole) {
  return async (req, res, next) => {
    try {
      const role = await resolveHrRole(req.user)
      if ((ROLE_HIERARCHY[role] ?? 0) < (ROLE_HIERARCHY[minRole] ?? 0)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Insufficient HR role' },
        })
      }
      req.hrRole = role
      return next()
    } catch (err) {
      return next(err)
    }
  }
}
