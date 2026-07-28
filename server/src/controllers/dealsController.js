import Joi from 'joi'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import {
  DealActivity,
  Deal,
  DealStatus,
  Lead,
  OpportunityStage,
  User,
  LeadTask,
  LeadTaskSubtask,
  LeadTaskComment,
  Reminder,
} from '../models/index.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { notifyDealStageChanged, notifyTaskAssigned, notifyTaskCommentAdded } from '../services/notification/teamNotificationService.js'
import {
  maybePromotePendingTaskFromSubtasks,
  promotePendingTasksByDueOrStartMany,
} from '../services/leadTaskAutoStatusService.js'
import {
  normalizeLeadTaskType,
  normalizeLeadTaskStatus,
  normalizeLeadTaskPriority,
  sanitizeAttachmentsInput,
  syncTaskReminders,
  replaceLeadTaskSubtasks,
  decorateTaskRow,
} from './leadsController.js'

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

    const dealRecipients = new Set()
    if (deal.assignedTo) dealRecipients.add(String(deal.assignedTo))
    if (deal.ownerUserId) dealRecipients.add(String(deal.ownerUserId))
    dealRecipients.delete(String(req.user.id))
    for (const uid of dealRecipients) {
      notifyDealStageChanged({
        companyId: req.user.companyId,
        workspaceId: deal.workspaceId,
        recipientUserId: uid,
        actorUserId: req.user.id,
        dealId: deal.id,
        dealName: deal.name,
        stage: deal.stage,
        created: true,
      }).catch(() => {})
    }

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
    const dealRecipients = new Set()
    if (deal.assignedTo) dealRecipients.add(String(deal.assignedTo))
    if (deal.ownerUserId) dealRecipients.add(String(deal.ownerUserId))
    dealRecipients.delete(String(req.user.id))
    for (const uid of dealRecipients) {
      notifyDealStageChanged({
        companyId: req.user.companyId,
        workspaceId: deal.workspaceId,
        recipientUserId: uid,
        actorUserId: req.user.id,
        dealId: deal.id,
        dealName: deal.name,
        stage: deal.stage,
        created: false,
      }).catch(() => {})
    }
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

// --- Deal-scoped task endpoints ---
// Tasks created here tag `dealId` on the shared `lead_tasks` table (see LeadTask
// model) so they show only on this deal's Tasks tab, not the parent lead's.

async function findScopedDeal(req) {
  const workspaceId = req.headers['x-workspace-id']
  if (!workspaceId) {
    const err = new Error('workspaceId is required')
    err.status = 400
    err.code = 'VALIDATION'
    throw err
  }
  return Deal.findOne({
    where: { id: req.params.id, workspaceId: String(workspaceId), isDeleted: false },
    attributes: ['id', 'companyId', 'workspaceId', 'opportunityLeadId'],
  })
}

function dealNotFound(res) {
  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } })
}

export async function listTasks(req, res, next) {
  try {
    const deal = await findScopedDeal(req)
    if (!deal) return dealNotFound(res)
    const rows = await LeadTask.findAll({
      where: { dealId: deal.id, companyId: req.user.companyId },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'], required: false },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
        {
          model: LeadTaskSubtask,
          as: 'subtasks',
          required: false,
          separate: true,
          order: [
            ['position', 'ASC'],
            ['createdAt', 'ASC'],
          ],
        },
        {
          model: LeadTaskComment,
          as: 'comments',
          required: false,
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'], required: false }],
          separate: true,
          order: [['createdAt', 'ASC']],
        },
      ],
      order: [['dueAt', 'ASC'], ['createdAt', 'DESC']],
    })
    await promotePendingTasksByDueOrStartMany(rows)
    const taskIds = rows.map((r) => r.id)
    const reminderRows = taskIds.length
      ? await Reminder.findAll({
          where: { companyId: req.user.companyId, targetType: 'task', targetId: { [Op.in]: taskIds } },
          attributes: ['id', 'targetId', 'remindAt', 'channelPush', 'channelEmail', 'status'],
          order: [['remindAt', 'ASC']],
        })
      : []
    const reminderByTask = new Map()
    for (const r of reminderRows) {
      const list = reminderByTask.get(r.targetId) || []
      list.push(r)
      reminderByTask.set(r.targetId, list)
    }
    const decorated = rows.map((row) => {
      const json = decorateTaskRow(row)
      json.reminders = reminderByTask.get(row.id) || []
      return json
    })
    return res.json({ success: true, data: decorated, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createTask(req, res, next) {
  try {
    const deal = await findScopedDeal(req)
    if (!deal) return dealNotFound(res)
    const title = String(req.body?.title || '').trim()
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Task title is required' } })
    if (!req.body?.startAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Start date is required' } })
    if (!req.body?.dueAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date is required' } })
    const startAt = new Date(req.body.startAt)
    const dueAt = new Date(req.body.dueAt)
    if (Number.isNaN(startAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid start date' } })
    if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid end date' } })
    if (dueAt < startAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date must be on or after the start date' } })

    const status = normalizeLeadTaskStatus(req.body?.status) || 'pending'
    const priority = normalizeLeadTaskPriority(req.body?.priority) || 'medium'
    const attachments = sanitizeAttachmentsInput(req.body?.attachments)

    const row = await LeadTask.create({
      leadId: deal.opportunityLeadId,
      dealId: deal.id,
      workspaceId: deal.workspaceId,
      companyId: deal.companyId,
      title,
      taskType: normalizeLeadTaskType(req.body?.taskType),
      description: req.body?.description || null,
      startAt,
      dueAt,
      priority,
      status,
      completedAt: status === 'completed' ? new Date() : null,
      createdBy: req.user.id,
      assignedTo: req.body?.assignedTo || null,
      attachments: attachments === undefined ? [] : attachments || [],
    })
    await replaceLeadTaskSubtasks(row.id, req.body?.subtasks)
    await maybePromotePendingTaskFromSubtasks(row)
    await row.reload()
    await syncTaskReminders({
      task: row,
      remindersInput: req.body?.reminders,
      actorUserId: req.user.id,
      workspaceId: deal.workspaceId,
      companyId: deal.companyId,
    })

    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    await DealActivity.create({
      type: 'task',
      body: `Task created: ${row.title} by ${actorName}`,
      metadata: { action: 'task_created', taskId: row.id, title: row.title, actorUserId: req.user.id },
      dealId: deal.id,
      userId: req.user.id,
    })
    if (row.assignedTo && String(row.assignedTo) !== String(req.user.id)) {
      notifyTaskAssigned({
        companyId: deal.companyId,
        workspaceId: deal.workspaceId,
        recipientUserId: row.assignedTo,
        actorUserId: req.user.id,
        tasks: [{ title: row.title }],
      }).catch(() => {})
    }
    return res.status(201).json({ success: true, data: decorateTaskRow(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchTask(req, res, next) {
  try {
    const row = await LeadTask.findOne({
      where: { id: req.params.taskId, dealId: req.params.id, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })
    const before = {
      status: row.status,
      priority: row.priority,
      assignedTo: row.assignedTo,
    }
    const payload = {}
    if ('title' in req.body) {
      const nextTitle = String(req.body.title || '').trim()
      if (!nextTitle) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Task title is required' } })
      payload.title = nextTitle
    }
    if ('taskType' in req.body) payload.taskType = normalizeLeadTaskType(req.body.taskType)
    if ('description' in req.body) payload.description = req.body.description || null
    if ('startAt' in req.body) {
      if (!req.body.startAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Start date is required' } })
      const startAt = new Date(req.body.startAt)
      if (Number.isNaN(startAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid start date' } })
      payload.startAt = startAt
    }
    if ('dueAt' in req.body) {
      if (!req.body.dueAt) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date is required' } })
      const dueAt = new Date(req.body.dueAt)
      if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid end date' } })
      payload.dueAt = dueAt
    }
    {
      const effectiveStart = payload.startAt ?? row.startAt
      const effectiveDue = payload.dueAt ?? row.dueAt
      if (effectiveStart && effectiveDue && new Date(effectiveDue) < new Date(effectiveStart)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'End date must be on or after the start date' } })
      }
    }
    if ('priority' in req.body) {
      const p = normalizeLeadTaskPriority(req.body.priority)
      if (p) payload.priority = p
    }
    if ('status' in req.body) {
      const s = normalizeLeadTaskStatus(req.body.status)
      if (s) {
        payload.status = s
        payload.completedAt = s === 'completed' ? new Date() : null
        if (s === 'pending') payload.skipTimeAutoInProgress = true
        else payload.skipTimeAutoInProgress = false
      }
    }
    if ('assignedTo' in req.body) payload.assignedTo = req.body.assignedTo || null
    if ('attachments' in req.body) {
      const sanitized = sanitizeAttachmentsInput(req.body.attachments)
      payload.attachments = sanitized === undefined ? [] : sanitized || []
    }
    if (Object.keys(payload).length) await row.update(payload)
    if ('subtasks' in req.body) {
      await replaceLeadTaskSubtasks(row.id, req.body.subtasks)
      await maybePromotePendingTaskFromSubtasks(row)
    }
    await row.reload()
    if ('reminders' in req.body) {
      await syncTaskReminders({
        task: row,
        remindersInput: req.body.reminders,
        actorUserId: req.user.id,
        workspaceId: row.workspaceId,
        companyId: row.companyId,
      })
    }

    const after = { status: row.status, priority: row.priority, assignedTo: row.assignedTo }
    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    if (before.status !== after.status) {
      await DealActivity.create({
        type: 'task',
        body: after.status === 'completed' ? `Task completed: ${row.title}` : `Task status: ${after.status} (${row.title})`,
        metadata: { action: 'task_status_changed', taskId: row.id, title: row.title, fromStatus: before.status, toStatus: after.status },
        dealId: row.dealId,
        userId: req.user.id,
      })
    }
    if (before.assignedTo !== after.assignedTo) {
      await DealActivity.create({
        type: 'task',
        body: after.assignedTo ? `Task reassigned: ${row.title} by ${actorName}` : `Task unassigned: ${row.title}`,
        metadata: { action: 'task_assigned', taskId: row.id, title: row.title, fromUserId: before.assignedTo, toUserId: after.assignedTo },
        dealId: row.dealId,
        userId: req.user.id,
      })
      if (after.assignedTo && String(after.assignedTo) !== String(req.user.id)) {
        notifyTaskAssigned({
          companyId: row.companyId,
          workspaceId: row.workspaceId,
          recipientUserId: after.assignedTo,
          actorUserId: req.user.id,
          tasks: [{ title: row.title }],
        }).catch(() => {})
      }
    }
    return res.json({ success: true, data: decorateTaskRow(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteTask(req, res, next) {
  try {
    const row = await LeadTask.findOne({
      where: { id: req.params.taskId, dealId: req.params.id, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })
    await Reminder.destroy({ where: { companyId: row.companyId, targetType: 'task', targetId: row.id } })
    await row.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function addTaskComment(req, res, next) {
  try {
    const task = await LeadTask.findOne({
      where: { id: req.params.taskId, dealId: req.params.id, companyId: req.user.companyId },
    })
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })
    const body = String(req.body?.body || '').trim()
    if (!body) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Comment cannot be empty' } })
    const isInternal = Boolean(req.body?.isInternal)
    const row = await LeadTaskComment.create({
      leadTaskId: task.id,
      userId: req.user.id,
      body: body.slice(0, 8000),
      isInternal,
    })
    const full = await LeadTaskComment.findByPk(row.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'], required: false }],
    })
    const commentTargets = new Set()
    if (task.assignedTo) commentTargets.add(String(task.assignedTo))
    if (task.createdBy) commentTargets.add(String(task.createdBy))
    commentTargets.delete(String(req.user.id))
    for (const uid of commentTargets) {
      notifyTaskCommentAdded({
        companyId: req.user.companyId,
        workspaceId: task.workspaceId,
        recipientUserId: uid,
        actorUserId: req.user.id,
        taskId: task.id,
        taskTitle: task.title,
        leadId: task.leadId,
      }).catch(() => {})
    }
    return res.status(201).json({ success: true, data: full, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getTaskTimeline(req, res, next) {
  try {
    const task = await LeadTask.findOne({
      where: { id: req.params.taskId, dealId: req.params.id, companyId: req.user.companyId },
    })
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } })

    const comments = await LeadTaskComment.findAll({
      where: { leadTaskId: task.id },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'], required: false }],
      order: [['createdAt', 'ASC']],
    })

    const activities = await DealActivity.findAll({
      where: { dealId: task.dealId, type: 'task' },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
      order: [['created_at', 'ASC']],
    })
    const taskActivities = activities.filter((a) => {
      const meta = a.metadata || {}
      return meta && meta.taskId === task.id
    })

    const items = []
    for (const c of comments) {
      items.push({
        id: c.id,
        kind: c.isInternal ? 'note' : 'comment',
        createdAt: c.createdAt,
        body: c.body,
        author: c.author ? { id: c.author.id, name: c.author.name, email: c.author.email } : null,
        isInternal: Boolean(c.isInternal),
      })
    }
    for (const a of taskActivities) {
      items.push({
        id: a.id,
        kind: 'event',
        createdAt: a.createdAt,
        body: a.body,
        author: a.user ? { id: a.user.id, name: a.user.name, email: a.user.email } : null,
        action: a.metadata?.action || null,
      })
    }
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    return res.json({ success: true, data: items, meta: {} })
  } catch (e) {
    return next(e)
  }
}
