import { isElevated } from '../services/recordVisibility.js'

/**
 * Reports every authenticated user may open. Access is intentionally open here:
 * the CONTROLLERS scope the underlying rows per user (e.g. `leads-report` returns
 * 653 rows to an admin and only the 20 assigned rows to a sales rep).
 *
 * This is deliberately a pass-through — do NOT add row-level logic here. If a new
 * report cannot scope itself per user, gate it with `requireTeamAnalytics` or
 * `requireAnalyticsAdmin` instead of loosening this one.
 */
export function requireAnalyticsView(_req, _res, next) {
  return next()
}

/**
 * SECURITY FIX (BUG-2) — cross-role reports.
 *
 * `team-report` aggregates PER COLLEAGUE (names, task counts, workloads) and is
 * scoped only by company + workspace, never by the requester. Behind the
 * pass-through `requireAnalyticsView` it returned every teammate's name and open
 * task counts to a plain sales rep, contradicting the "reps see only what's
 * assigned to them" rule enforced everywhere else.
 *
 * Elevated = company admin | workspace_admin | manager — the same predicate
 * `leadVisibility` and `recordVisibility` use, so roles stay consistent.
 */
export function requireTeamAnalytics(req, res, next) {
  if (isElevated(req.user)) return next()
  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'You do not have access to team-wide reports' },
  })
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
