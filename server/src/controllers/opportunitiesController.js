import Joi from 'joi'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { Opportunity, OpportunityStage, User } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'

const createOpportunitySchema = Joi.object({
  leadId: Joi.string().uuid().allow(null, ''),
  ownerUserId: Joi.string().uuid().allow(null, ''),
  fullName: Joi.string().trim().max(255).required(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
  phoneNumber: Joi.string().trim().max(64).allow('', null),
  directPhone: Joi.string().trim().max(64).allow('', null),
  jobTitle: Joi.string().trim().max(160).allow('', null),
  companyName: Joi.string().trim().max(255).required(),
  industry: Joi.string().trim().max(160).allow('', null),
  companySize: Joi.string().trim().max(80).allow('', null),
  employeeRange: Joi.string().trim().max(80).allow('', null),
  website: Joi.string().uri().allow('', null),
  linkedin: Joi.string().uri().allow('', null),
  location: Joi.string().trim().max(160).allow('', null),
  timezone: Joi.string().trim().max(80).allow('', null),
  dealValue: Joi.number().min(0).default(0),
  currentStage: Joi.string().trim().max(80).allow('', null),
  leadScore: Joi.number().integer().min(0).max(100).default(0),
  tags: Joi.array().items(Joi.string().trim().max(64)).default([]),
  lastActivityType: Joi.string().trim().max(80).allow('', null),
  lastActivityText: Joi.string().trim().allow('', null),
  lastActivityAt: Joi.date().iso().allow(null, ''),
}).required()

const updateOpportunitySchema = createOpportunitySchema.fork(['fullName', 'companyName', 'currentStage'], (s) => s.optional())

function parsePaging(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10))
  return { page, limit, offset: (page - 1) * limit }
}

function normalizeNullable(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  const v = String(value).trim()
  return v || null
}

async function resolveInitialOpportunityStage(workspaceId, companyId, requested) {
  const trimmed = requested !== undefined && requested !== null ? String(requested).trim() : ''
  if (trimmed) return trimmed
  const def = await OpportunityStage.findOne({
    where: { workspaceId, companyId, isDefault: true },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  })
  if (def) return def.name
  const first = await OpportunityStage.findOne({
    where: { workspaceId, companyId },
    order: [
      ['sortOrder', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  })
  if (first) return first.name
  return 'Lead Inbound'
}

async function opportunityAccessWhere(req) {
  const accessWhere = { companyId: req.user.companyId, isDeleted: false }
  const selectedWorkspaceId = req.query.workspaceId || req.headers['x-workspace-id']
  const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)

  if (selectedWorkspaceId) {
    if (!allowedWorkspaceIds.includes(String(selectedWorkspaceId))) {
      const err = new Error('You do not have access to this workspace')
      err.status = 403
      err.code = 'FORBIDDEN'
      err.publicMessage = 'You do not have access to this workspace'
      throw err
    }
    // Also include workspace-agnostic (workspace_id IS NULL) opportunities
    // created before the frontend started sending `x-workspace-id`.
    accessWhere[Op.or] = [{ workspaceId: String(selectedWorkspaceId) }, { workspaceId: null }]
  } else if (allowedWorkspaceIds.length && !req.user.isCompanyAdmin) {
    accessWhere[Op.or] = [{ workspaceId: allowedWorkspaceIds }, { workspaceId: null }]
  }

  return accessWhere
}

function serializeOpportunity(row) {
  return {
    ...row.toJSON(),
    owner: row.owner ? { id: row.owner.id, name: row.owner.name, email: row.owner.email } : null,
  }
}

export async function list(req, res, next) {
  try {
    const { page, limit, offset } = parsePaging(req.query)
    const where = await opportunityAccessWhere(req)
    const stage = String(req.query.stage || '').trim()
    if (stage && stage !== 'undefined') where.currentStage = stage
    const ownerUserId = String(req.query.ownerUserId || '').trim()
    if (ownerUserId && ownerUserId !== 'undefined') where.ownerUserId = ownerUserId
    const search = String(req.query.search || '').trim()
    if (search) {
      const q = `%${search.toLowerCase()}%`
      where[Op.or] = [
        sqlWhere(fn('LOWER', col('Opportunity.full_name')), { [Op.like]: q }),
        sqlWhere(fn('LOWER', col('Opportunity.company_name')), { [Op.like]: q }),
        sqlWhere(fn('LOWER', col('Opportunity.email')), { [Op.like]: q }),
        sqlWhere(fn('LOWER', col('Opportunity.job_title')), { [Op.like]: q }),
      ]
    }

    const { rows, count } = await Opportunity.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
    })
    return res.json({ success: true, data: rows.map(serializeOpportunity), meta: { total: count, page, limit } })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req, res, next) {
  try {
    const where = await opportunityAccessWhere(req)
    where.id = req.params.id
    const row = await Opportunity.findOne({ where, include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }] })
    if (!row) {
      const err = new Error('Opportunity not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Opportunity not found'
      throw err
    }
    return res.json({ success: true, data: serializeOpportunity(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const { error, value } = createOpportunitySchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = error.details.map((d) => d.message).join(', ')
      throw err
    }

    // Keep behavior consistent with `leadsController.create`:
    // workspace comes from `x-workspace-id` header (set by the frontend).
    const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId
    if (!workspaceId) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'workspaceId is required'
      throw err
    }

    const currentStage = await resolveInitialOpportunityStage(String(workspaceId), req.user.companyId, value.currentStage)

    const row = await Opportunity.create({
      ...value,
      currentStage,
      leadId: normalizeNullable(value.leadId),
      ownerUserId: normalizeNullable(value.ownerUserId) || req.user.id,
      website: normalizeNullable(value.website),
      linkedin: normalizeNullable(value.linkedin),
      companyId: req.user.companyId,
      workspaceId: String(workspaceId),
      createdBy: req.user.id,
      updatedBy: req.user.id,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function update(req, res, next) {
  try {
    const { error, value } = updateOpportunitySchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = error.details.map((d) => d.message).join(', ')
      throw err
    }
    const where = await opportunityAccessWhere(req)
    where.id = req.params.id
    const row = await Opportunity.findOne({ where })
    if (!row) {
      const err = new Error('Opportunity not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Opportunity not found'
      throw err
    }
    await row.update({
      ...value,
      leadId: value.leadId !== undefined ? normalizeNullable(value.leadId) : row.leadId,
      ownerUserId: value.ownerUserId !== undefined ? normalizeNullable(value.ownerUserId) : row.ownerUserId,
      website: value.website !== undefined ? normalizeNullable(value.website) : row.website,
      linkedin: value.linkedin !== undefined ? normalizeNullable(value.linkedin) : row.linkedin,
      updatedBy: req.user.id,
    })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchStage(req, res, next) {
  try {
    const stage = String(req.body?.currentStage || '').trim()
    if (!stage) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'currentStage is required'
      throw err
    }
    const where = await opportunityAccessWhere(req)
    where.id = req.params.id
    const row = await Opportunity.findOne({ where })
    if (!row) {
      const err = new Error('Opportunity not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Opportunity not found'
      throw err
    }
    await row.update({ currentStage: stage, updatedBy: req.user.id })
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

