import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { Lead } from '../models/index.js'

export async function findDuplicates(workspaceId, { email, phone }, excludeLeadId = null) {
  const conditions = []
  if (email) {
    conditions.push(sqlWhere(fn('LOWER', col('email')), String(email).trim().toLowerCase()))
  }
  if (phone) {
    conditions.push({ phone: String(phone).trim() })
  }
  if (!conditions.length) return []

  const where = { workspaceId, isDeleted: false, [Op.or]: conditions }
  if (excludeLeadId) where.id = { [Op.ne]: excludeLeadId }

  return Lead.findAll({
    where,
    attributes: ['id', 'title', 'contactName', 'email', 'phone', 'status', 'score', 'company'],
    limit: 5,
    order: [['updatedAt', 'DESC']],
  })
}
