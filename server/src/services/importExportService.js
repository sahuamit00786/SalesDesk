import { Op } from 'sequelize'
import { sequelize } from '../config/db.js'
import { Lead, OpportunityStage, Tag, User, LeadAssignment } from '../models/index.js'
import { findDuplicates } from './duplicateDetectionService.js'
import { recalculateScore } from './leadScoringService.js'
import { createLeadSystemActivity } from './leadSystemActivity.js'
import { autoAssignLead } from './assignmentRulesService.js'

const LEAD_STATUS = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'junk']

let assignmentsTableCache = null

async function leadAssignmentsTableExists() {
  if (assignmentsTableCache !== null) return assignmentsTableCache
  try {
    const [rows] = await sequelize.query("SHOW TABLES LIKE 'lead_assignments'")
    assignmentsTableCache = Array.isArray(rows) && rows.length > 0
    return assignmentsTableCache
  } catch {
    assignmentsTableCache = false
    return false
  }
}

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

function parseBoolCell(v) {
  if (v === true || v === false) return v
  const s = String(v ?? '').trim().toLowerCase()
  if (['yes', 'y', 'true', '1'].includes(s)) return true
  if (['no', 'n', 'false', '0'].includes(s)) return false
  return false
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
    opportunityStage: String(row.opportunityStage ?? '').trim() || defaultPipeline,
    requirement: row.requirement || null,
    notes: row.notes || null,
    isOpportunity: parseBoolCell(row.isOpportunity),
    profileMeta: profileMeta && Object.keys(profileMeta).length ? profileMeta : null,
  }
}

export async function importLeads(workspaceId, companyId, userId, rows) {
  const results = { imported: 0, skipped: 0, errors: [], createdLeadIds: [] }
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
  const hasAssignments = await leadAssignmentsTableExists()

  for (const [idx, row] of (rows || []).entries()) {
    try {
      const dupes = await findDuplicates(workspaceId, { email: row.email, phone: row.phone })
      if (dupes.length) {
        results.skipped += 1
        continue
      }
      const payload = buildLeadRowPayload(row, defaultPipeline, userId, companyId, workspaceId)
      const lead = await Lead.create(payload)
      await recalculateScore(lead.id)
      results.createdLeadIds.push(lead.id)

      const tagNames = parseList(row.tags)
      if (tagNames.length) {
        const tags = await Promise.all(
          tagNames.map(async (name) => {
            const existing = await Tag.findOne({ where: { companyId, name } })
            if (existing) return existing
            return Tag.create({ name, companyId, workspaceId })
          }),
        )
        await lead.setTags(tags)
      }

      const assigneeIds = parseList(row.assignedUserIds).map(uuidOrNull).filter(Boolean)
      if (assigneeIds.length && hasAssignments) {
        await LeadAssignment.bulkCreate(
          assigneeIds.map((assignUserId) => ({ leadId: lead.id, userId: assignUserId })),
          { ignoreDuplicates: true },
        )
      }

      await autoAssignLead(lead)
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
  if (ids?.length) where.id = { [Op.in]: ids }
  const iso = String(filters.isOpportunity ?? '').toLowerCase()
  if (iso === 'true' || iso === '1') where.isOpportunity = true
  if (iso === 'false' || iso === '0') where.isOpportunity = false

  const leads = await Lead.findAll({
    where,
    include: [
      { model: Tag, as: 'tags', through: { attributes: [] }, required: false },
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
    Tags: (l.tags || []).map((t) => t.name).join(', '),
    CreatedAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
  }))
}
