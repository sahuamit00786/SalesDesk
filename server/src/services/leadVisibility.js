import { Op } from 'sequelize'
import { TeamMember } from '../models/index.js'

/**
 * Sequelize `where` fragment for leads the user may see (company-scoped).
 * Company admin: all company leads.
 * Other roles: own leads and same-team leads.
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
    return { companyId, ownerUserId: user.id }
  }
  const peers = await TeamMember.findAll({
    where: { teamId: { [Op.in]: teamIds } },
    attributes: ['userId'],
  })
  const userIds = [...new Set(peers.map((p) => p.userId))]
  if (!userIds.includes(user.id)) userIds.push(user.id)
  return { companyId, ownerUserId: { [Op.in]: userIds } }
}
