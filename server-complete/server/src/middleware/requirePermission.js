import { can } from '../services/permissionService.js'

export function requirePermission(resource, action) {
  return function requirePermissionMiddleware(req, res, next) {
    if (!req.permissionSet) {
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_MISCONFIG', message: 'Permissions not loaded' },
      })
    }
    if (!can(req.permissionSet, resource, action)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission for this action' },
      })
    }
    return next()
  }
}
