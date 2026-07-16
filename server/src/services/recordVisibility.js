import { Op } from 'sequelize'

/**
 * ONE place that answers "can this user see everything, or only their own?"
 * — implementing exactly the rule you specified:
 *
 *   companyAdmin | workspace_admin | manager  →  ALL records in scope
 *   everyone else (sales / telecaller / custom / null) →  only records that
 *   are theirs (owner / assignee / creator, depending on the table)
 *
 * `leadVisibility.leadAccessWhere` already implements this for leads and is
 * used across leadsController (leads, followups, activities, tasks). This
 * module generalizes the same rule so the remaining modules (calls today;
 * anything new tomorrow) share ONE definition of "elevated" instead of
 * re-deriving it — the campaigns controller and listAllTasks each have their
 * own copy of this boolean today, which is how scoping gaps happen.
 */

export function isElevated(user) {
  const kind = user?.userRoleKind
  return Boolean(user?.isCompanyAdmin) || kind === 'workspace_admin' || kind === 'manager'
}

/**
 * Generic where-fragment for tables that carry ownership columns.
 * Usage:
 *   const where = {
 *     companyId: user.companyId,
 *     ...(workspaceId ? { workspaceId } : {}),
 *     ...ownScopedWhere(user, ['ownerUserId', 'assignedTo']),
 *   }
 * Elevated users get no extra clause (see everything in company/workspace scope).
 */
export function ownScopedWhere(user, ownerColumns) {
  if (isElevated(user)) return {}
  const cols = Array.isArray(ownerColumns) ? ownerColumns : [ownerColumns]
  const clauses = cols.map((c) => ({ [c]: user.id }))
  return clauses.length === 1 ? clauses[0] : { [Op.or]: clauses }
}
