import { Op } from 'sequelize'
import { TeamMember } from '../models/index.js'

/**
 * Sequelize `where` fragment for leads the user may see (company-scoped).
 * Company admin: all company leads.
 * Other roles: leads they created OR are assigned to (`assignedTo`), and same for teammates
 * (either field may match). Pipeline and list UIs use assignee heavily; filtering only
 * `ownerUserId` hid deals assigned to the current user but created by someone else.
 */
export async function leadAccessWhere(user) {
  const companyId = user.companyId
  if (!companyId) return { id: { [Op.eq]: null } }

  if (user.isCompanyAdmin) {
    return { companyId }
  }
  const memberships = await TeamMember.findAll({
    where: { userId: user.id },
    attributes: ['teamId'],
  })
  const teamIds = memberships.map((m) => m.teamId)
  if (!teamIds.length) {
    return {
      companyId,
      [Op.or]: [{ ownerUserId: user.id }, { assignedTo: user.id }],
    }
  }
  const peers = await TeamMember.findAll({
    where: { teamId: { [Op.in]: teamIds } },
    attributes: ['userId'],
  })
  const userIds = [...new Set(peers.map((p) => p.userId))]
  if (!userIds.includes(user.id)) userIds.push(user.id)
  return {
    companyId,
    [Op.or]: [{ ownerUserId: { [Op.in]: userIds } }, { assignedTo: { [Op.in]: userIds } }],
  }
}
