import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { Lead, DuplicateLead } from '../models/index.js'

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

export function resolveMatchField(leadData, firstDupe) {
  const emailMatch =
    leadData.email &&
    firstDupe.email &&
    String(leadData.email).trim().toLowerCase() === String(firstDupe.email).trim().toLowerCase()
  const phoneMatch =
    leadData.phone &&
    firstDupe.phone &&
    String(leadData.phone).trim() === String(firstDupe.phone).trim()
  if (emailMatch && phoneMatch) return 'both'
  if (emailMatch) return 'email'
  if (phoneMatch) return 'phone'
  return 'email_or_phone'
}

/** Queue an attempted lead as a duplicate record instead of hard-rejecting it. */
export async function saveDuplicateRecord({ leadData, dupes, source, workspaceId, companyId, createdByUserId }) {
  const first = dupes[0]
  const matchField = resolveMatchField(leadData, first)
  const matchedLeadTitle = first?.title || first?.contactName || 'Unknown'
  return DuplicateLead.create({
    leadData,
    matchedLeadId: first?.id || null,
    matchedLeadTitle,
    matchField,
    source: source || 'manual',
    status: 'pending',
    workspaceId: workspaceId || null,
    companyId,
    createdByUserId: createdByUserId || null,
    isDeleted: false,
  })
}
