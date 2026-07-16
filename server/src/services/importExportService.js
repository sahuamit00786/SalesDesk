import { Op } from 'sequelize'
import { Lead, OpportunityStage, User } from '../models/index.js'
import { findDuplicates, saveDuplicateRecord } from './duplicateDetectionService.js'
import { recalculateScore } from './leadScoringService.js'
import { createLeadSystemActivity } from './leadSystemActivity.js'
import { autoAssignLead } from './assignmentRulesService.js'
import { notifyLeadAssignedBatch } from './notification/teamNotificationService.js'
import { upsertLeadCustomFields } from './customFieldService.js'
import { phoneDigitsKey } from '../utils/phoneDigits.js'

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

  for (const [idx, row] of (rows || []).entries()) {
    try {
      const dupes = await findDuplicates(workspaceId, { email: row.email, phone: row.phone })
      if (dupes.length) {
        await saveDuplicateRecord({
          leadData: { ...row, source: 'csv_import' },
          dupes,
          source: 'csv_import',
          workspaceId,
          companyId,
          createdByUserId: userId,
        })
        results.duplicates += 1
        continue
      }
      const payload = buildLeadRowPayload(row, defaultPipeline, userId, companyId, workspaceId)
      const lead = await Lead.create(payload)
      await upsertLeadCustomFields({
        leadId: lead.id,
        workspaceId,
        companyId,
        customFields: row.customFields || {},
      })
      await recalculateScore(lead.id)
      results.createdLeadIds.push(lead.id)

      if (payload.assignedTo) {
        const uid = String(payload.assignedTo)
        if (uid !== String(userId)) {
          assignCounts.set(uid, (assignCounts.get(uid) || 0) + 1)
        }
      } else {
        const assignedUserId = await autoAssignLead(lead, { suppressNotification: true })
        if (assignedUserId && String(assignedUserId) !== String(userId)) {
          assignCounts.set(String(assignedUserId), (assignCounts.get(String(assignedUserId)) || 0) + 1)
        }
      }

      await createLeadSystemActivity({
        leadId: lead.id,
        userId,
        body: 'Lead imported from CSV',
        metadata: { action: 'lead_imported_csv', source: 'csv_import' },
      })
      results.imported += 1
    } catch (err) {
      results.errors.push({ row: idx + 1, message: err.message })
    }
  }

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
