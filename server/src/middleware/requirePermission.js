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

/**
 * Like `requirePermission`, but also passes when `paramName` on the route matches the
 * caller's own id — e.g. viewing your own team profile shouldn't require the
 * `settings.team` grant that's meant for admins browsing *other* people's records.
 */
export function requirePermissionOrSelf(resource, action, paramName = 'id') {
  const base = requirePermission(resource, action)
  return function requirePermissionOrSelfMiddleware(req, res, next) {
    if (req.user && req.params[paramName] === req.user.id) {
      return next()
    }
    return base(req, res, next)
  }
}
