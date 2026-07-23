import { randomUUID } from 'node:crypto'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { Lead, OpportunityStage, User, AssignmentRule, Activity, CustomField, CustomFieldValue, DuplicateLead } from '../models/index.js'
import { resolveMatchField } from './duplicateDetectionService.js'
import { SCORE_WEIGHTS } from './leadScoringService.js'
import { matchesConditions, pickAssignee } from './assignmentRulesService.js'
import { notifyLeadAssignedBatch } from './notification/teamNotificationService.js'
import { validateValueAgainstField } from './customFieldService.js'
import { phoneDigitsKey } from '../utils/phoneDigits.js'

/** Insert rows in chunks so a single statement never exceeds MySQL's packet size. */
const BULK_CHUNK_SIZE = 500

async function bulkInsertChunked(Model, rows) {
  for (let i = 0; i < rows.length; i += BULK_CHUNK_SIZE) {
    await Model.bulkCreate(rows.slice(i, i + BULK_CHUNK_SIZE))
  }
}

const LEAD_STATUS = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'junk']

function parseList(val) {
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean)
  if (val == null || val === '') return []
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function normStatus(s) {
  const t = String(s || '').trim().toLowerCase()
  return LEAD_STATUS.includes(t) ? t : 'new'
}

function uuidOrNull(s) {
  const t = String(s ?? '').trim()
  if (!t) return null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)) return t
  return null
}

function buildLeadRowPayload(row, defaultPipeline, userId, companyId, workspaceId) {
  const valueRaw = row.value !== undefined && row.value !== '' && row.value != null ? Number(row.value) : 0
  const valueNum = Number.isFinite(valueRaw) ? valueRaw : 0
  let valueCurrency = String(row.valueCurrency || 'USD')
    .trim()
    .toUpperCase()
    .slice(0, 3)
  if (!/^[A-Z]{3}$/.test(valueCurrency)) valueCurrency = 'USD'

  const whats = row.whatsappNumber != null && String(row.whatsappNumber).trim() ? String(row.whatsappNumber).trim() : ''
  const baseMeta = typeof row.profileMeta === 'object' && row.profileMeta && !Array.isArray(row.profileMeta) ? { ...row.profileMeta } : {}
  const profileMeta =
    whats || Object.keys(baseMeta).length
      ? { ...baseMeta, ...(whats ? { whatsappNumber: whats } : {}) }
      : null

  return {
    title: row.title || row.contactName || 'Untitled lead',
    contactName: row.contactName || null,
    company: row.company || null,
    email: row.email || null,
    phone: row.phone || null,
    phoneCountryCode: row.phoneCountryCode || null,
    altPhone: row.altPhone || null,
    altPhoneCountryCode: row.altPhoneCountryCode || null,
    designation: row.designation || null,
    street: row.street || null,
    city: row.city || null,
    state: row.state || null,
    country: row.country || null,
    postalCode: row.postalCode || null,
    value: valueNum,
    valueCurrency,
    status: normStatus(row.status),
    source: 'csv_import',
    sourceId: uuidOrNull(row.sourceId),
    ownerUserId: userId,
    assignedTo: uuidOrNull(row.assignedTo),
    companyId,
    workspaceId,
    opportunityStage: Boolean(row.isOpportunity)
      ? String(row.opportunityStage ?? '').trim() || defaultPipeline
      : null,
    requirement: row.requirement || null,
    notes: row.notes || null,
    isOpportunity: Boolean(row.isOpportunity),
    profileMeta: profileMeta && Object.keys(profileMeta).length ? profileMeta : null,
    phoneDigits: phoneDigitsKey(row.phone) || null,
    altPhoneDigits: phoneDigitsKey(row.altPhone) || null,
  }
}

export async function importLeads(workspaceId, companyId, userId, rows) {
  const results = { imported: 0, skipped: 0, duplicates: 0, errors: [], createdLeadIds: [] }
  const allRows = rows || []
  if (!allRows.length) return results

  const defStage =
    (await OpportunityStage.findOne({
      where: { workspaceId, companyId, isDefault: true },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    })) ||
    (await OpportunityStage.findOne({
      where: { workspaceId, companyId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    }))
  const defaultPipeline = defStage?.name || 'Lead Inbound'
  const assignCounts = new Map()

  // Fetch cross-row dependencies once instead of per-row (was the ~10-query-per-row bottleneck).
  const [assignmentRules, customFieldDefs] = await Promise.all([
    AssignmentRule.findAll({ where: { workspaceId, isActive: true }, order: [['priority', 'ASC']] }),
    CustomField.findAll({ where: { workspaceId }, order: [['order', 'ASC'], ['createdAt', 'ASC']] }),
  ])

  const emailSet = new Set()
  const phoneSet = new Set()
  for (const row of allRows) {
    if (row.email) emailSet.add(String(row.email).trim().toLowerCase())
    if (row.phone) phoneSet.add(String(row.phone).trim())
  }
  let existingMatches = []
  if (emailSet.size || phoneSet.size) {
    const orConds = []
    if (emailSet.size) orConds.push(sqlWhere(fn('LOWER', col('email')), { [Op.in]: [...emailSet] }))
    if (phoneSet.size) orConds.push({ phone: { [Op.in]: [...phoneSet] } })
    existingMatches = await Lead.findAll({
      where: { workspaceId, isDeleted: false, [Op.or]: orConds },
      attributes: ['id', 'title', 'contactName', 'email', 'phone', 'status', 'score', 'company'],
      order: [['updatedAt', 'DESC']],
    })
  }
  const byEmail = new Map()
  const byPhone = new Map()
  for (const l of existingMatches) {
    if (l.email) {
      const k = String(l.email).trim().toLowerCase()
      if (!byEmail.has(k)) byEmail.set(k, l)
    }
    if (l.phone) {
      const k = String(l.phone).trim()
      if (!byPhone.has(k)) byPhone.set(k, l)
    }
  }
  // Rows already claimed earlier in this same batch also count as duplicates for later rows.
  const claimedByEmail = new Map()
  const claimedByPhone = new Map()

  const leadsToCreate = []
  const activityRows = []
  const customFieldValueRows = []
  const duplicatesToCreate = []

  for (const [idx, row] of allRows.entries()) {
    try {
      const emailKey = row.email ? String(row.email).trim().toLowerCase() : ''
      const phoneKey = row.phone ? String(row.phone).trim() : ''
      const matched =
        (emailKey && claimedByEmail.get(emailKey)) ||
        (phoneKey && claimedByPhone.get(phoneKey)) ||
        (emailKey && byEmail.get(emailKey)) ||
        (phoneKey && byPhone.get(phoneKey)) ||
        null

      if (matched) {
        const leadData = { ...row, source: 'csv_import' }
        duplicatesToCreate.push({
          leadData,
          matchedLeadId: matched.id || null,
          matchedLeadTitle: matched.title || matched.contactName || 'Unknown',
          matchField: resolveMatchField(leadData, matched),
          source: 'csv_import',
          status: 'pending',
          workspaceId: workspaceId || null,
          companyId,
          createdByUserId: userId || null,
          isDeleted: false,
        })
        results.duplicates += 1
        continue
      }

      const id = randomUUID()
      const payload = { ...buildLeadRowPayload(row, defaultPipeline, userId, companyId, workspaceId), id }

      // Score is computed fresh on a just-built lead with no activities yet — no DB round trip needed.
      let score = 0
      if (payload.email) score += SCORE_WEIGHTS.hasEmail
      if (payload.phone) score += SCORE_WEIGHTS.hasPhone
      if (payload.companyId) score += SCORE_WEIGHTS.hasCompany
      if (Number(payload.value || 0) > 0) score += SCORE_WEIGHTS.hasValue
      if (payload.closingDate) score += SCORE_WEIGHTS.hasClosingDate
      payload.score = Math.min(100, score)

      // Custom fields validated against the pre-fetched definitions (throws -> row lands in results.errors).
      if (row.customFields && typeof row.customFields === 'object' && customFieldDefs.length) {
        for (const field of customFieldDefs) {
          const hasKey = Object.prototype.hasOwnProperty.call(row.customFields, field.key)
          const raw = hasKey ? row.customFields[field.key] : undefined
          if (!hasKey && !field.isRequired) continue
          const stored = validateValueAgainstField(field, raw)
          if (stored === null) continue
          customFieldValueRows.push({ customFieldId: field.id, leadId: id, value: stored })
        }
      }

      if (payload.assignedTo) {
        const uid = String(payload.assignedTo)
        if (uid !== String(userId)) {
          assignCounts.set(uid, (assignCounts.get(uid) || 0) + 1)
        }
      } else {
        for (const rule of assignmentRules) {
          if (!matchesConditions(payload, rule.conditions)) continue
          const assignedUserId = await pickAssignee(rule)
          if (!assignedUserId) continue
          payload.assignedTo = assignedUserId
          activityRows.push({
            type: 'assignment',
            leadId: id,
            userId: assignedUserId,
            body: `Assigned by rule ${rule.name}`,
            metadata: { ruleId: rule.id, userId: assignedUserId },
          })
          if (String(assignedUserId) !== String(userId)) {
            assignCounts.set(String(assignedUserId), (assignCounts.get(String(assignedUserId)) || 0) + 1)
          }
          break
        }
      }

      activityRows.push({
        type: 'system',
        leadId: id,
        userId: userId || null,
        body: 'Lead imported from CSV',
        metadata: { actorUserId: userId, action: 'lead_imported_csv', source: 'csv_import' },
      })

      leadsToCreate.push(payload)
      results.createdLeadIds.push(id)
      results.imported += 1

      const claim = { id, title: payload.title, contactName: payload.contactName, email: payload.email, phone: payload.phone, status: payload.status, score: payload.score, company: payload.company }
      if (emailKey) claimedByEmail.set(emailKey, claim)
      if (phoneKey) claimedByPhone.set(phoneKey, claim)
    } catch (err) {
      results.errors.push({ row: idx + 1, message: err.message })
    }
  }

  await bulkInsertChunked(Lead, leadsToCreate)
  await bulkInsertChunked(CustomFieldValue, customFieldValueRows)
  await bulkInsertChunked(Activity, activityRows)
  await bulkInsertChunked(DuplicateLead, duplicatesToCreate)

  if (assignCounts.size) {
    notifyLeadAssignedBatch({
      companyId,
      workspaceId,
      actorUserId: userId,
      countByUserId: assignCounts,
    }).catch(() => {})
  }

  return results
}

export async function exportLeads(workspaceId, filters = {}, ids = null, companyId = null) {
  const where = {
    isDeleted: false,
  }
  if (workspaceId) {
    where.workspaceId = workspaceId
  } else if (companyId) {
    where.companyId = companyId
  }
  if (filters.status?.length) where.status = { [Op.in]: filters.status }
  if (filters.source?.length) where.source = { [Op.in]: filters.source }
  if (filters.assignedTo?.length) where.assignedTo = { [Op.in]: filters.assignedTo }
  if (filters.isOpportunity === true) where.isOpportunity = true
  else if (filters.isOpportunity === false) where.isOpportunity = false
  if (filters.search?.trim()) {
    const like = { [Op.like]: `%${filters.search.trim()}%` }
    where[Op.or] = [{ title: like }, { contactName: like }, { company: like }, { email: like }]
  }
  if (ids?.length) where.id = { [Op.in]: ids }

  const leads = await Lead.findAll({
    where,
    include: [
      { model: User, as: 'assignee', attributes: ['name'], required: false },
    ],
    order: [['createdAt', 'DESC']],
  })

  return leads.map((l) => ({
    Name: l.contactName || l.title || '',
    Company: l.company || '',
    Email: l.email || '',
    Phone: l.phone || '',
    Status: l.status,
    PipelineStatus: l.opportunityStage || '',
    Source: l.source,
    Score: l.score,
    Value: l.value,
    AssignedTo: l.assignee?.name || '',
    CreatedAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
  }))
}
