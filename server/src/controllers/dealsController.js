import Joi from 'joi'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { DealActivity, Deal, DealStatus, Lead, OpportunityStage, User } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'
import { leadAccessWhere } from '../services/leadVisibility.js'

const dealIncludes = [
  {
    model: Lead,
    as: 'opportunity',
    attributes: ['id', 'title', 'contactName', 'company', 'email', 'phone', 'phoneCountryCode', 'designation', 'score'],
    required: true,
  },
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
]

function parsePaging(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(400, Math.max(1, Number(query.limit) || 25))
  return { page, limit, offset: (page - 1) * limit }
}

function parseCsvParam(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'undefined') return []
  return [...new Set(raw.split(',').map((x) => x.trim()).filter(Boolean))]
}

function normalizeNullable(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  const v = String(value).trim()
  return v || null
}

function normalizeDealCurrency(value) {
  const c = String(value ?? 'USD')
    .trim()
    .toUpperCase()
  return /^[A-Z]{3}$/.test(c) ? c : 'USD'
}

async function resolveActorDisplayName(userId, emailFallback) {
  const u = await User.findByPk(userId, { attributes: ['name', 'email'] })
  const n = u?.name?.trim()
  if (n) return n
  return u?.email?.trim() || emailFallback || 'Someone'
}

async function resolveInitialDealStage(workspaceId, companyId) {
  const initial = await DealStatus.findOne({
    where: { workspaceId, companyId, isInitial: true },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
  })
  if (initial) return initial.name
  const first = await DealStatus.findOne({
    where: { workspaceId, companyId },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
  })
  if (first) return first.name
  return 'Qualification'
}

async function assertParentOpportunityLead({ leadId, companyId, workspaceId }) {
  const row = await Lead.findOne({
    where: { id: leadId, companyId, isDeleted: false, isOpportunity: true },
  })
  if (!row) {
    const err = new Error('Invalid opportunity')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'Parent must be an existing funnel opportunity lead.'
    throw err
  }
  if (String(row.workspaceId) !== String(workspaceId)) {
    const err = new Error('Lead belongs to a different workspace')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'Lead belongs to a different workspace'
    throw err
  }
  return row
}

function isoTimestampOrNull(value) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Same card shape the deals UI already expects (was backed by `Lead` pipeline rows). */
export function serializeDealForClient(deal) {
  const plain = deal.get ? deal.get({ plain: true }) : deal
  const opp = plain.opportunity || {}
  const assignee = plain.assignee
  const phoneNumber = [opp.phoneCountryCode, opp.phone].filter(Boolean).join(' ').trim() || null
  const createdSrc = plain.createdAt ?? plain.created_at
  const updatedSrc = plain.updatedAt ?? plain.updated_at
  return {
    id: plain.id,
    entityType: 'deal',
    companyId: plain.companyId,
    workspaceId: plain.workspaceId,
    leadId: null,
    ownerUserId: plain.assignedTo || plain.ownerUserId,
    fullName: (opp.contactName || '').trim() || 'Lead',
    dealName: String(plain.name || '').trim() || null,
    dealDescription: String(plain.description || '').trim() || null,
    dealCurrency: normalizeDealCurrency(plain.valueCurrency),
    pipelineDeal: true,
    email: opp.email || null,
    phoneNumber,
    jobTitle: opp.designation || null,
    companyName: (opp.company || '').trim() || 'Unknown company',
    dealValue: plain.value,
    currentStage: plain.stage || 'open',
    leadScore: opp.score ?? 0,
    tags: [],
    lastActivityType: null,
    lastActivityText: null,
    lastActivityAt: isoTimestampOrNull(updatedSrc),
    createdAt: isoTimestampOrNull(createdSrc),
    updatedAt: isoTimestampOrNull(updatedSrc),
    owner: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email || null } : null,
    parentOpportunityLeadId: plain.opportunityLeadId || null,
  }
}

const createDealSchema = Joi.object({
  opportunityLeadId: Joi.string().uuid().required(),
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(65535).allow('', null),
  value: Joi.number().min(0).default(0),
  valueCurrency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase().default('USD'),
  ownerUserId: Joi.string().uuid().allow(null, ''),
})

export async function list(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const allowed = await allowedWorkspaceIdsForUser(req.user)
    if (allowed.length && !allowed.includes(String(workspaceId)) && !req.user.isCompanyAdmin) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No access to workspace' } })
    }

    const { page, limit, offset } = parsePaging(req.query)
    const access = await leadAccessWhere(req.user)
    const where = {
      ...access,
      workspaceId: String(workspaceId),
      isDeleted: false,
    }

    const stages = parseCsvParam(req.query.stage)
    if (stages.length === 1) where.stage = stages[0]
    else if (stages.length > 1) where.stage = { [Op.in]: stages }

    const ownerUserIds = parseCsvParam(req.query.ownerUserId)
    if (ownerUserIds.length === 1) where.assignedTo = ownerUserIds[0]
    else if (ownerUserIds.length > 1) where.assignedTo = { [Op.in]: ownerUserIds }

    const parentOppId = String(req.query.parentOpportunityLeadId ?? '').trim()
    if (parentOppId && /^[0-9a-f-]{36}$/i.test(parentOppId)) {
      where.opportunityLeadId = parentOppId
    }

    const andParts = [where]
    const search = String(req.query.search || '').trim()
    if (search) {
      const q = `%${search.toLowerCase()}%`
      andParts.push({
        [Op.or]: [
          sqlWhere(fn('LOWER', col('deals.name')), { [Op.like]: q }),
          sqlWhere(fn('LOWER', col('deals.description')), { [Op.like]: q }),
        ],
      })
    }

    const finalWhere = andParts.length === 1 ? andParts[0] : { [Op.and]: andParts }

    const sortKey = String(req.query.sort || 'updatedAt').trim()
    const orderDir = String(req.query.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    // Must use the actual DB column names because Sequelize won't translate camelCase
    // virtual timestamp aliases (updatedAt → updated_at) in the ORDER BY clause.
    const sortCol = {
      updatedAt: 'updated_at',
      createdAt: 'created_at',
      dealValue: 'value',
      fullName: 'updated_at',
      companyName: 'updated_at',
      leadScore: 'updated_at',
      currentStage: 'stage',
    }[sortKey] || 'updated_at'
    const order = [[sortCol, orderDir]]

    const { rows, count } = await Deal.findAndCountAll({
      where: finalWhere,
      include: dealIncludes,
      order,
      limit,
      offset,
      // Use primary key for distinct count; `id` here refers to the Deal model PK.
      distinct: true,
      col: 'id',
    })

    return res.json({
      success: true,
      data: rows.map((d) => serializeDealForClient(d)),
      meta: { total: count, page, limit },
    })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const access = await leadAccessWhere(req.user)
    const deal = await Deal.findOne({
      where: {
        ...access,
        id: req.params.id,
        workspaceId: String(workspaceId),
        isDeleted: false,
      },
      include: dealIncludes,
    })
    if (!deal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } })
    }
    return res.json({ success: true, data: serializeDealForClient(deal), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { error, value } = createDealSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: error.details.map((d) => d.message).join(', ') },
      })
    }
    const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }

    const parent = await assertParentOpportunityLead({
      leadId: value.opportunityLeadId,
      companyId: req.user.companyId,
      workspaceId: String(workspaceId),
    })

    const stage = await resolveInitialDealStage(String(workspaceId), req.user.companyId)
    const ownerId = normalizeNullable(value.ownerUserId) || parent.assignedTo || req.user.id

    const deal = await Deal.create({
      workspaceId: String(workspaceId),
      companyId: req.user.companyId,
      opportunityLeadId: value.opportunityLeadId,
      name: String(value.name).trim().slice(0, 255),
      description: value.description !== undefined ? normalizeNullable(value.description) : null,
      value: value.value ?? 0,
      valueCurrency: normalizeDealCurrency(value.valueCurrency),
      stage,
      assignedTo: ownerId,
      ownerUserId: req.user.id,
      isDeleted: false,
    })

    await deal.reload({ include: dealIncludes })
    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    await DealActivity.create({
      type: 'system',
      body: `Deal created by ${actorName}`,
      metadata: {
        action: 'deal_created',
        parentOpportunityLeadId: value.opportunityLeadId,
        actorUserId: req.user.id,
        activityTypeKey: 'system',
        title: 'Deal created',
      },
      dealId: deal.id,
      userId: req.user.id,
    })

    return res.status(201).json({ success: true, data: serializeDealForClient(deal), meta: {} })
  } catch (e) {
    return next(e)
  }
}

const patchDealSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  description: Joi.string().trim().max(65535).allow('', null),
  value: Joi.number().min(0),
  valueCurrency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase(),
  ownerUserId: Joi.string().uuid().allow(null, ''),
}).min(1)

export async function update(req, res, next) {
  try {
    const { error, value } = patchDealSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: error.details.map((d) => d.message).join(', ') },
      })
    }
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const access = await leadAccessWhere(req.user)
    const deal = await Deal.findOne({
      where: {
        ...access,
        id: req.params.id,
        workspaceId: String(workspaceId),
        isDeleted: false,
      },
      include: dealIncludes,
    })
    if (!deal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } })
    }

    const updates = {}
    if (value.name !== undefined) updates.name = value.name
    if (value.description !== undefined) updates.description = normalizeNullable(value.description)
    if (value.value !== undefined) updates.value = value.value
    if (value.valueCurrency !== undefined) updates.valueCurrency = normalizeDealCurrency(value.valueCurrency)
    if (value.ownerUserId !== undefined) updates.assignedTo = normalizeNullable(value.ownerUserId)

    await deal.update(updates)
    await deal.reload({ include: dealIncludes })
    return res.json({ success: true, data: serializeDealForClient(deal), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchStage(req, res, next) {
  try {
    const stage = String(req.body?.currentStage || '').trim()
    if (!stage) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'currentStage is required' } })
    }
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const access = await leadAccessWhere(req.user)
    const deal = await Deal.findOne({
      where: {
        ...access,
        id: req.params.id,
        workspaceId: String(workspaceId),
        isDeleted: false,
      },
      include: dealIncludes,
    })
    if (!deal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } })
    }
    const previousStage = deal.stage || ''
    if (previousStage === stage) {
      return res.json({ success: true, data: serializeDealForClient(deal), meta: {} })
    }
    await deal.update({ stage })
    await deal.reload({ include: dealIncludes })
    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    await DealActivity.create({
      type: 'status_change',
      body: `Deal stage changed from ${previousStage || '—'} to ${stage} by ${actorName}`,
      metadata: {
        action: 'deal_stage_changed',
        from: previousStage,
        to: stage,
        actorUserId: req.user.id,
      },
      dealId: deal.id,
      userId: req.user.id,
    })
    return res.json({ success: true, data: serializeDealForClient(deal), meta: {} })
  } catch (e) {
    return next(e)
  }
}

// --- Deal-scoped activity endpoints ---

const createActivitySchema = Joi.object({
  type: Joi.string()
    .valid('note', 'call', 'email', 'meeting', 'task', 'status_change', 'assignment', 'system')
    .required(),
  body: Joi.string().trim().max(65535).allow('', null),
  metadata: Joi.object().unknown(true).allow(null),
})

export async function listActivities(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const deal = await Deal.findOne({
      where: { id: req.params.id, workspaceId: String(workspaceId), isDeleted: false },
      attributes: ['id'],
    })
    if (!deal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } })
    }
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
    const offset = (page - 1) * limit
    const { rows, count } = await DealActivity.findAndCountAll({
      where: { dealId: deal.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
      col: 'id',
    })
    return res.json({ success: true, data: rows, meta: { page, limit, total: count } })
  } catch (e) {
    return next(e)
  }
}

export async function createActivity(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const deal = await Deal.findOne({
      where: { id: req.params.id, workspaceId: String(workspaceId), isDeleted: false },
      attributes: ['id'],
    })
    if (!deal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } })
    }
    const { error, value } = createActivitySchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: error.details.map((d) => d.message).join(', ') },
      })
    }
    const row = await DealActivity.create({
      type: value.type,
      body: value.body ?? null,
      metadata: value.metadata ?? {},
      dealId: deal.id,
      userId: req.user.id,
    })
    await row.reload({ include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }] })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'workspaceId is required' } })
    }
    const access = await leadAccessWhere(req.user)
    const deal = await Deal.findOne({
      where: {
        ...access,
        id: req.params.id,
        workspaceId: String(workspaceId),
        isDeleted: false,
      },
    })
    if (!deal) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } })
    }
    await deal.update({ isDeleted: true })
    return res.json({ success: true, data: { id: deal.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
