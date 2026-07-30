import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { Lead, DuplicateLead } from '../models/index.js'
import { leadAccessWhere } from './leadVisibility.js'

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

/**
 * §5.4 of the bug audit: the create-duplicate 202 response echoed the FULL matched
 * lead(s) back to the requester with no visibility check — a low-privilege rep could
 * probe for the existence and contact details of leads owned by someone else just by
 * attempting a create. findDuplicates() itself stays unfiltered (the admin duplicate
 * review queue needs full cross-owner detection to work); this only redacts what goes
 * back in the HTTP response to the acting user.
 */
export async function redactDupesForUser(dupes, user, workspaceId) {
  if (!dupes?.length || !user) return dupes
  const ids = dupes.map((d) => d.id)
  const visible = await Lead.findAll({
    where: { ...(await leadAccessWhere(user, { workspaceId })), id: ids },
    attributes: ['id'],
  })
  const visibleIds = new Set(visible.map((r) => String(r.id)))
  return dupes.map((d) => {
    const plain = typeof d.get === 'function' ? d.get({ plain: true }) : d
    return visibleIds.has(String(plain.id)) ? plain : { id: plain.id, restricted: true }
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
