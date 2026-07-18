import { Op } from 'sequelize'

/**
 * Sequelize `where` fragment for leads the user may see.
 *
 * Pass `workspaceId` to also gate by workspace in the same clause — prevents
 * controllers from forgetting to add workspace filtering separately.
 *
 * isCompanyAdmin / workspace_admin / manager → all leads in scope
 * sales / custom / null → only leads they own (ownerUserId) or are assigned to (assignedTo)
 */
export async function leadAccessWhere(user, { workspaceId } = {}) {
  const companyId = user.companyId
  if (!companyId) return { id: { [Op.eq]: null } }

  const base = workspaceId ? { companyId, workspaceId } : { companyId }
  const kind = user.userRoleKind

  if (user.isCompanyAdmin || kind === 'workspace_admin' || kind === 'manager') {
    return base
  }

  return {
    ...base,
    [Op.or]: [{ assignedTo: user.id }, { ownerUserId: user.id }],
  }
}
