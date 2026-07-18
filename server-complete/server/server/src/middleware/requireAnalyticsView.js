import { isElevated } from '../services/recordVisibility.js'

/** Company admins, workspace admins, and managers see full workspace analytics. Sales users see scoped data in controllers. */
export function requireAnalyticsView(req, res, next) {
  if (isElevated(req.user)) return next()
  // Sales users can still view their own scoped reports
  return next()
}

/** Owner-only reports: company admin or workspace admin */
export function requireAnalyticsAdmin(req, res, next) {
  const { isCompanyAdmin, userRoleKind } = req.user
  if (isCompanyAdmin || userRoleKind === 'workspace_admin') return next()
  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Admin access required for this report' },
  })
}
