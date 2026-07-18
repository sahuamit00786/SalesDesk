import { Op } from 'sequelize'
import { sequelize, DuplicateLead, Lead, Tag, LeadAssignment } from '../models/index.js'
import { createLeadSystemActivity } from '../services/leadSystemActivity.js'
import { recalculateScore } from '../services/leadScoringService.js'
import { autoAssignLead } from '../services/assignmentRulesService.js'
import { phoneDigitsKey } from '../utils/phoneDigits.js'

let assignmentsTableCache = null
async function hasLeadAssignmentsTable() {
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

const POTENTIAL_DUPLICATE_TAG = 'potential-duplicate'

const MERGE_FIELDS = [
  'contactName',
  'company',
  'email',
  'phone',
  'phoneCountryCode',
  'altPhone',
  'altPhoneCountryCode',
  'designation',
  'street',
  'city',
  'state',
  'country',
  'postalCode',
  'value',
  'requirement',
  'status',
]

function normIncomingName(leadData) {
  return leadData.contactName || leadData.fullName || leadData.title || 'Unknown'
}

/** GET /leads/duplicates — list pending duplicates for workspace */
export async function list(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId required' } })

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const offset = (page - 1) * limit

    const { rows, count } = await DuplicateLead.findAndCountAll({
      where: { workspaceId, status: 'pending', isDeleted: false },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    })

    const matchedLeadIds = [...new Set(rows.map((r) => r.matchedLeadId).filter(Boolean))]
    const matchedLeads = matchedLeadIds.length
      ? await Lead.findAll({
          where: { id: { [Op.in]: matchedLeadIds }, isDeleted: false },
          attributes: [
            'id', 'title', 'contactName', 'company', 'email', 'phone', 'phoneCountryCode',
            'altPhone', 'altPhoneCountryCode', 'designation', 'street', 'city', 'state',
            'country', 'postalCode', 'value', 'requirement', 'status', 'score',
          ],
        })
      : []

    const leadMap = Object.fromEntries(matchedLeads.map((l) => [l.id, l.get({ plain: true })]))

    const data = rows.map((r) => ({
      ...r.get({ plain: true }),
      matchedLead: r.matchedLeadId ? leadMap[r.matchedLeadId] || null : null,
    }))

    return res.json({ success: true, data, meta: { total: count, page, limit } })
  } catch (e) {
    return next(e)
  }
}

/** DELETE /leads/duplicates/:id — soft delete the queued record */
export async function remove(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const record = await DuplicateLead.findOne({
      where: { id: req.params.id, workspaceId, isDeleted: false },
    })
    if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Duplicate record not found' } })

    await record.update({ isDeleted: true, status: 'deleted' })
    return res.json({ success: true, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/** POST /leads/duplicates/:id/create — create as real lead with tag + activity */
export async function createAsLead(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const record = await DuplicateLead.findOne({
      where: { id: req.params.id, workspaceId, status: 'pending', isDeleted: false },
    })
    if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Duplicate record not found' } })

    const data = record.leadData || {}
    const isOpportunity = Boolean(data.isOpportunity)

    const payload = {
      title: data.title || data.contactName || data.fullName || 'Untitled lead',
      contactName: data.contactName || data.fullName || null,
      company: data.company || data.companyName || null,
      email: data.email || null,
      phone: data.phone || null,
      phoneCountryCode: data.phoneCountryCode || null,
      altPhone: data.altPhone || null,
      altPhoneCountryCode: data.altPhoneCountryCode || null,
      designation: data.designation || data.jobTitle || null,
      street: data.street || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      postalCode: data.postalCode || null,
      value: Number(data.value || data.dealValue || 0),
      valueCurrency: data.valueCurrency || data.dealCurrency || 'USD',
      requirement: data.requirement || data.dealDescription || null,
      status: data.status || 'new',
      source: data.source || 'manual',
      sourceId: data.sourceId || null,
      opportunityStage: data.opportunityStage || data.currentStage || null,
      isOpportunity,
      ownerUserId: req.user.id,
      assignedTo: data.assignedTo || null,
      companyId: req.user.companyId,
      workspaceId,
      isDeleted: false,
      phoneDigits: phoneDigitsKey(data.phone) || null,
      altPhoneDigits: phoneDigitsKey(data.altPhone) || null,
    }

    const lead = await Lead.create(payload)

    const tagNames = Array.isArray(data.tags) ? data.tags : []
    const allTagNames = [...new Set([...tagNames, POTENTIAL_DUPLICATE_TAG])]
    const tags = await Promise.all(
      allTagNames.map(async (name) => {
        const ex = await Tag.findOne({ where: { companyId: req.user.companyId, name } })
        if (ex) return ex
        const color = name === POTENTIAL_DUPLICATE_TAG ? '#f59e0b' : '#3b73f5'
        return Tag.create({ name, color, companyId: req.user.companyId, workspaceId })
      }),
    )
    await lead.setTags(tags)

    if (data.assignedUserIds?.length && (await hasLeadAssignmentsTable())) {
      await LeadAssignment.bulkCreate(
        data.assignedUserIds.map((userId) => ({ leadId: lead.id, userId })),
        { ignoreDuplicates: true },
      )
    }

    await autoAssignLead(lead)

    const matchedName = record.matchedLeadTitle || 'an existing lead'
    const matchField = record.matchField || 'phone/email'
    await createLeadSystemActivity({
      leadId: lead.id,
      userId: req.user.id,
      body: `Lead created from duplicate queue. May be a duplicate of "${matchedName}" (matched by ${matchField}).`,
      metadata: {
        action: 'created_from_duplicate',
        matchedLeadId: record.matchedLeadId,
        matchedLeadTitle: matchedName,
        matchField,
        duplicateRecordId: record.id,
      },
    })

    await recalculateScore(lead.id)
    await record.update({ status: 'created' })

    return res.status(201).json({ success: true, data: lead, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/** POST /leads/duplicates/:id/merge — merge incoming fields into existing lead */
export async function merge(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    const record = await DuplicateLead.findOne({
      where: { id: req.params.id, workspaceId, status: 'pending', isDeleted: false },
    })
    if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Duplicate record not found' } })

    if (!record.matchedLeadId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No matched lead to merge into' } })
    }

    const matchedLead = await Lead.findOne({
      where: { id: record.matchedLeadId, isDeleted: false },
    })
    if (!matchedLead) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Matched lead no longer exists' } })
    }

    const fieldSelections = req.body.fieldSelections || {}
    const incoming = record.leadData || {}
    const updatedFields = []
    const patch = {}

    for (const field of MERGE_FIELDS) {
      const selection = fieldSelections[field]
      if (selection !== 'incoming' && selection !== 'existing') continue

      const incomingVal = incoming[field] ?? null
      const existingVal = matchedLead[field] ?? null

      const chosen = selection === 'incoming' ? incomingVal : existingVal
      if (chosen !== existingVal) {
        patch[field] = chosen
        updatedFields.push(field)
      }
    }

    if (Object.keys(patch).length) {
      await matchedLead.update(patch)
    }

    const incomingName = normIncomingName(incoming)
    const fieldList = updatedFields.length ? updatedFields.join(', ') : 'no fields'
    await createLeadSystemActivity({
      leadId: matchedLead.id,
      userId: req.user.id,
      body: `Merged with incoming duplicate "${incomingName}". Updated fields: ${fieldList}.`,
      metadata: {
        action: 'duplicate_merged',
        incomingName,
        updatedFields,
        duplicateRecordId: record.id,
        matchField: record.matchField,
      },
    })

    await record.update({ status: 'merged' })

    const updatedLead = await matchedLead.reload()
    return res.json({ success: true, data: updatedLead, meta: {} })
  } catch (e) {
    return next(e)
  }
}
