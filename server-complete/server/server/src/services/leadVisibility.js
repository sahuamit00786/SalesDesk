import { Op } from 'sequelize'
import { allowedWorkspaceIdsForUser } from './userWorkspaceService.js'

/**
 * Sequelize `where` fragment for leads the user may see.
 *
 * Pass `workspaceId` to gate by ONE workspace in the same clause (callers must
 * have validated access to it — workspaceContext / scopedWorkspaceIdsForRequest
 * do this). When NO workspaceId is passed, non-company-admins are automatically
 * narrowed to the workspaces they belong to (user_workspaces), so a
 * workspace_admin of 2 workspaces can never see a third workspace's leads even
 * through endpoints that forget to add workspace filtering themselves
 * (activities feed, deals, opportunities, campaigns, search, file access).
 *
 * Row-level rule on top of the workspace scope:
 *   isCompanyAdmin / workspace_admin / manager → ALL leads in scope
 *   sales / telecaller / custom / null         → only leads they own
 *                                                (ownerUserId) or are assigned
 *                                                to (assignedTo)
 */
export async function leadAccessWhere(user, { workspaceId, workspaceIds } = {}) {
  const companyId = user.companyId
  if (!companyId) return { id: { [Op.eq]: null } }

  const base = { companyId }
  if (workspaceId) {
    base.workspaceId = String(workspaceId)
  } else if (Array.isArray(workspaceIds)) {
    // Caller already computed a validated scope (e.g. scopedWorkspaceIdsForRequest)
    // — narrower than or equal to the user's allowed set, so use it as-is.
    base.workspaceId = workspaceIds.length ? { [Op.in]: workspaceIds.map(String) } : { [Op.eq]: null }
  } else if (!user.isCompanyAdmin) {
    const allowed = await allowedWorkspaceIdsForUser(user)
    // A user in zero workspaces sees zero leads — never the whole company.
    base.workspaceId = allowed.length ? { [Op.in]: allowed } : { [Op.eq]: null }
  }

  const kind = user.userRoleKind
  if (user.isCompanyAdmin || kind === 'workspace_admin' || kind === 'manager') {
    return base
  }

  return {
    ...base,
    [Op.or]: [{ assignedTo: user.id }, { ownerUserId: user.id }],
  }
}
