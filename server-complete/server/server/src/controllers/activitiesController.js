import crypto from 'crypto'
import Joi from 'joi'
import { Op } from 'sequelize'
import {
  Activity,
  ActivityBookingLink,
  ActivityReminder,
  ActivityType,
  Lead,
  LeadTask,
  User,
} from '../models/index.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { allowedWorkspaceIdsForUser, scopedWorkspaceIdsForRequest } from '../services/userWorkspaceService.js'

const DEFAULT_ACTIVITY_TYPES = [
  { key: 'call', name: 'Call', icon: 'PhoneCall', color: '#0f766e', description: 'Phone interaction with lead' },
  { key: 'email', name: 'Email', icon: 'Mail', color: '#1d4ed8', description: 'Email exchange with lead' },
  { key: 'meeting', name: 'Meeting', icon: 'CalendarCheck2', color: '#7c3aed', description: 'Meeting or calendar event' },
  { key: 'note', name: 'Note', icon: 'NotebookPen', color: '#b45309', description: 'Internal note or summary' },
  { key: 'demo', name: 'Demo', icon: 'Presentation', color: '#0e7490', description: 'Product demo activity' },
  { key: 'discovery', name: 'Discovery', icon: 'Search', color: '#475569', description: 'Discovery call or meeting' },
  { key: 'follow_up', name: 'Follow-up', icon: 'ArrowRightCircle', color: '#be123c', description: 'Follow-up interaction' },
  { key: 'in_person_visit', name: 'In-person visit', icon: 'MapPin', color: '#1f2937', description: 'Face-to-face visit' },
  { key: 'task', name: 'Task', icon: 'ClipboardCheck', color: '#0ea5e9', description: 'Task created on the lead' },
  { key: 'status_change', name: 'Status change', icon: 'GitBranch', color: '#a855f7', description: 'Lead or pipeline status moved' },
  { key: 'assignment', name: 'Assignment', icon: 'UserRoundCheck', color: '#10b981', description: 'Lead ownership changed' },
  { key: 'document', name: 'Document', icon: 'FileText', color: '#06b6d4', description: 'Document linked or removed' },
  { key: 'tag', name: 'Tag', icon: 'Tag', color: '#f59e0b', description: 'Tags added or removed' },
  { key: 'system', name: 'System', icon: 'Settings2', color: '#6366f1', description: 'Automatic system entry' },
]

/** Values the `activities.type` ENUM column can hold. */
const DB_ENUM_TYPES = ['note', 'call', 'email', 'meeting', 'task', 'status_change', 'assignment', 'system']

const createActivitySchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  activityTypeKey: Joi.string().max(64).required(),
  title: Joi.string().max(200).allow('', null),
  description: Joi.string().allow('', null),
  outcome: Joi.string().max(120).allow('', null),
  durationMinutes: Joi.number().integer().min(0).max(24 * 60).allow(null),
  attendees: Joi.array().items(Joi.string().uuid()).max(30).default([]),
  linkedDealId: Joi.string().max(64).allow('', null),
  scheduled: Joi.boolean().default(false),
  metadata: Joi.object().unknown(true).default({}),
})

function parseCsvList(value) {
  if (Array.isArray(value)) return value.map((x) => String(x || '').trim()).filter(Boolean)
  if (!value) return []
  return String(value)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function normalizeDateRange(from, to) {
  const out = {}
  if (from) {
    const d = new Date(from)
    if (!Number.isNaN(d.getTime())) out[Op.gte] = d
  }
  if (to) {
    const d = new Date(to)
    if (!Number.isNaN(d.getTime())) out[Op.lte] = d
  }
  return Object.keys(out).length ? out : null
}

function activityTypeDbValue(key) {
  if (['note', 'call', 'email', 'meeting'].includes(key)) return key
  return 'meeting'
}

/**
 * The type a row should be shown and filtered as. `activities.type` is a coarse ENUM — custom
 * types are stored as 'meeting' — so metadata.activityTypeKey is authoritative when it exists.
 */
function effectiveTypeKey(row) {
  return row?.metadata?.activityTypeKey || row?.type
}

async function findAccessibleLead(req, leadId) {
  const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
  if (!workspaceIds.length) return null
  return Lead.findOne({
    where: {
      id: leadId,
      ...(await leadAccessWhere(req.user, { workspaceIds })),
    },
  })
}

async function resolveTypeConfig(companyId) {
  const customRows = await ActivityType.findAll({
    where: { companyId },
    order: [['name', 'ASC']],
  })
  const merged = new Map(DEFAULT_ACTIVITY_TYPES.map((x) => [x.key, { ...x, isDefault: true }]))
  for (const row of customRows) {
    merged.set(row.key, {
      id: row.id,
      key: row.key,
      name: row.name,
      icon: row.icon,
      color: row.color,
      description: row.description,
      isDefault: row.isDefault,
    })
  }
  return [...merged.values()]
}

export async function listActivities(req, res, next) {
  try {
    const workspaceIds = await scopedWorkspaceIdsForRequest(req)
    if (!workspaceIds.length) return res.json({ success: true, data: [], meta: { page: 1, limit: 20, total: 0 } })
    const scope = String(req.query.scope || 'global')
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    const offset = (page - 1) * limit
    const typeKeys = parseCsvList(req.query.types)
    const attendeeIds = parseCsvList(req.query.attendees)
    const assignedTo = parseCsvList(req.query.assignedTo)
    const authorUserIds = parseCsvList(req.query.userId)
    const q = String(req.query.search || '').trim()
    const outcome = String(req.query.outcome || '').trim()
    const leadId = req.query.leadId ? String(req.query.leadId) : null

    const createdAtRange = normalizeDateRange(req.query.from, req.query.to)
    const leadWhere = {
      isDeleted: false,
      ...(await leadAccessWhere(req.user, { workspaceIds })),
    }
    if (scope === 'lead' && leadId) leadWhere.id = leadId
    if (assignedTo.length) leadWhere.assignedTo = { [Op.in]: assignedTo }

    const activityWhere = {}
    if (createdAtRange) activityWhere.createdAt = createdAtRange
    if (authorUserIds.length) activityWhere.userId = { [Op.in]: authorUserIds }
    if (typeKeys.length) {
      // Narrow to a superset here (a row matches on either the ENUM column or the metadata key);
      // `effectiveTypeKey` below decides exactly, since metadata.activityTypeKey wins when present.
      const enumKeys = typeKeys.filter((x) => DB_ENUM_TYPES.includes(x))
      const or = [{ 'metadata.activityTypeKey': { [Op.in]: typeKeys } }]
      if (enumKeys.length) or.push({ type: { [Op.in]: enumKeys } })
      activityWhere[Op.and] = [{ [Op.or]: or }]
    }

    const activityRows = await Activity.findAll({
      where: activityWhere,
      include: [
        { model: Lead, as: 'lead', required: true, where: leadWhere, attributes: ['id', 'title', 'company', 'assignedTo'] },
        { model: User, as: 'user', required: false, attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 500,
    })

    const taskWhere = {
      companyId: req.user.companyId,
      workspaceId: { [Op.in]: workspaceIds },
    }
    if (createdAtRange) taskWhere.createdAt = createdAtRange
    if (scope === 'lead' && leadId) taskWhere.leadId = leadId
    if (assignedTo.length) taskWhere.assignedTo = { [Op.in]: assignedTo }
    if (authorUserIds.length) taskWhere.createdBy = { [Op.in]: authorUserIds }
    const taskRows = await LeadTask.findAll({
      where: taskWhere,
      include: [
        { model: Lead, as: 'lead', required: true, where: leadWhere, attributes: ['id', 'title', 'company', 'assignedTo'] },
        { model: User, as: 'creator', required: false, attributes: ['id', 'name', 'email'] },
        { model: User, as: 'assignee', required: false, attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 500,
    })

    // Intentionally omit lead_emails: those rows mirror Gmail sync/storage and are not the same as
    // CRM `activities` (logged calls, sent-email activities, notes, etc.). Email appears here when
    // recorded as an Activity (e.g. send flow, manual log).

    const normalizedActivities = activityRows.map((row) => ({
      id: row.id,
      type: row.type,
      body: row.body,
      metadata: row.metadata || {},
      lead: row.lead,
      user: row.user,
      createdAt: row.createdAt,
      sourceTable: 'activities',
    }))

    const normalizedTasks = taskRows.map((row) => ({
      id: `task-${row.id}`,
      type: 'task',
      body: row.description || row.title || 'Task activity',
      metadata: {
        activityTypeKey: row.taskType || 'follow_up',
        title: row.title || 'Task',
        description: row.description || '',
        outcome: row.status || null,
        durationMinutes: null,
        attendeeIds: row.assignedTo ? [row.assignedTo] : [],
        attendees: row.assignee ? [{ id: row.assignee.id, name: row.assignee.name, email: row.assignee.email }] : [],
        linkedDealId: null,
        scheduled: false,
      },
      lead: row.lead,
      user: row.creator || row.assignee || null,
      createdAt: row.createdAt,
      sourceTable: 'lead_tasks',
    }))

    const merged = [...normalizedActivities, ...normalizedTasks].map((row) => ({
      ...row,
      typeKey: effectiveTypeKey(row),
    }))

    const fromMs = createdAtRange?.[Op.gte]?.getTime() ?? null
    const toMs = createdAtRange?.[Op.lte]?.getTime() ?? null

    const filtered = merged.filter((row) => {
      const rowMs = new Date(row.createdAt).getTime()
      if (fromMs !== null && rowMs < fromMs) return false
      if (toMs !== null && rowMs > toMs) return false
      const meta = row.metadata || {}
      if (typeKeys.length && !typeKeys.includes(row.typeKey)) return false
      if (outcome && String(meta.outcome || '') !== outcome) return false
      if (attendeeIds.length) {
        const ids = Array.isArray(meta.attendeeIds) ? meta.attendeeIds : []
        if (!attendeeIds.some((id) => ids.includes(id))) return false
      }
      if (q) {
        const haystack = `${meta.title || ''} ${meta.description || ''} ${row.body || ''} ${row.lead?.title || ''}`.toLowerCase()
        if (!haystack.includes(q.toLowerCase())) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const paged = filtered.slice(offset, offset + limit)

    return res.json({
      success: true,
      data: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
      },
    })
  } catch (e) {
    return next(e)
  }
}

export async function createActivity(req, res, next) {
  try {
    const { error, value } = createActivitySchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })

    const lead = await findAccessibleLead(req, value.leadId)
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })

    const attendees = await User.findAll({
      where: {
        id: { [Op.in]: value.attendees || [] },
        companyId: req.user.companyId,
      },
      attributes: ['id', 'name', 'email'],
    })

    const row = await Activity.create({
      type: activityTypeDbValue(value.activityTypeKey),
      body: value.description || value.title || '',
      leadId: value.leadId,
      userId: req.user.id,
      metadata: {
        ...value.metadata,
        activityTypeKey: value.activityTypeKey,
        title: value.title || '',
        description: value.description || '',
        outcome: value.outcome || null,
        durationMinutes: value.durationMinutes ?? null,
        attendeeIds: attendees.map((a) => a.id),
        attendees: attendees.map((a) => ({ id: a.id, name: a.name, email: a.email })),
        linkedDealId: value.linkedDealId || null,
        scheduled: Boolean(value.scheduled),
      },
    })

    const created = await Activity.findOne({
      where: { id: row.id },
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'title', 'company'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
    })
    return res.status(201).json({ success: true, data: created, meta: {} })
  } catch (e) {
    return next(e)
  }
}

const typeSchema = Joi.object({
  key: Joi.string().max(64).required(),
  name: Joi.string().max(120).required(),
  icon: Joi.string().max(64).required(),
  color: Joi.string().max(32).required(),
  description: Joi.string().max(500).allow('', null),
})

export async function listActivityTypes(req, res, next) {
  try {
    const data = await resolveTypeConfig(req.user.companyId)
    return res.json({ success: true, data, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createActivityType(req, res, next) {
  try {
    const { error, value } = typeSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    const row = await ActivityType.create({
      companyId: req.user.companyId,
      ...value,
      isDefault: false,
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchActivityType(req, res, next) {
  try {
    const { error, value } = typeSchema.fork(['key'], (schema) => schema.optional()).validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    const row = await ActivityType.findOne({ where: { id: req.params.typeId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Type not found' } })
    await row.update(value)
    return res.json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteActivityType(req, res, next) {
  try {
    const row = await ActivityType.findOne({ where: { id: req.params.typeId, companyId: req.user.companyId } })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Type not found' } })
    await row.destroy()
    return res.json({ success: true, data: { ok: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createBookingLink(req, res, next) {
  try {
    const existing = await ActivityBookingLink.findOne({
      where: { userId: req.user.id, companyId: req.user.companyId, isActive: true },
      order: [['createdAt', 'DESC']],
    })
    const row = existing || (await ActivityBookingLink.create({
      companyId: req.user.companyId,
      userId: req.user.id,
      token: crypto.randomBytes(24).toString('hex'),
      isActive: true,
    }))
    const bookingUrl = `${req.protocol}://${req.get('host')}/api/v1/activities/book/${row.token}`
    return res.json({ success: true, data: { bookingUrl, token: row.token }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

const bookingSchema = Joi.object({
  leadId: Joi.string().uuid().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  scheduledAt: Joi.date().required(),
  durationMinutes: Joi.number().integer().min(0).max(24 * 60).required(),
  attendees: Joi.array().items(Joi.string().uuid()).max(30).default([]),
})

export async function confirmBooking(req, res, next) {
  try {
    const booking = await ActivityBookingLink.findOne({ where: { token: req.params.token, isActive: true } })
    if (!booking) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking link not found' } })
    const { error, value } = bookingSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })

    const lead = await Lead.findOne({ where: { id: value.leadId, companyId: booking.companyId, isDeleted: false } })
    if (!lead) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    const hostUser = await User.findOne({ where: { id: booking.userId, companyId: booking.companyId } })

    const attendees = await User.findAll({
      where: { id: { [Op.in]: value.attendees }, companyId: booking.companyId },
      attributes: ['id', 'name', 'email'],
    })

    const row = await Activity.create({
      type: 'meeting',
      body: value.description || value.title,
      leadId: lead.id,
      userId: hostUser?.id || null,
      metadata: {
        activityTypeKey: 'meeting',
        title: value.title,
        description: value.description || '',
        durationMinutes: value.durationMinutes,
        attendeeIds: attendees.map((a) => a.id),
        attendees: attendees.map((a) => ({ id: a.id, name: a.name, email: a.email })),
        scheduled: true,
        bookingToken: booking.token,
        scheduledAt: value.scheduledAt,
      },
    })
    return res.status(201).json({ success: true, data: row, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getBookingLinkInfo(req, res, next) {
  try {
    const booking = await ActivityBookingLink.findOne({ where: { token: req.params.token, isActive: true } })
    if (!booking) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking link not found' } })
    return res.json({
      success: true,
      data: {
        token: booking.token,
        hostUserId: booking.userId,
        message: 'Booking link active. Submit meeting details using POST on this URL.',
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

const reminderSchema = Joi.object({
  remindAt: Joi.date().required(),
  channelPush: Joi.boolean().default(true),
  channelEmail: Joi.boolean().default(true),
})

export async function createReminder(req, res, next) {
  try {
    const { error, value } = reminderSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    const row = await Activity.findByPk(req.params.activityId, {
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'companyId'] }],
    })
    if (!row || row.lead?.companyId !== req.user.companyId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Activity not found' } })
    }
    const reminder = await ActivityReminder.create({
      companyId: req.user.companyId,
      activityId: row.id,
      createdBy: req.user.id,
      remindAt: value.remindAt,
      channelPush: value.channelPush,
      channelEmail: value.channelEmail,
      status: 'pending',
    })
    return res.status(201).json({ success: true, data: reminder, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listUpcomingReminders(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const rows = await ActivityReminder.findAll({
      where: {
        companyId: req.user.companyId,
        status: 'pending',
        remindAt: { [Op.gte]: new Date() },
      },
      include: [{
        model: Activity,
        as: 'activity',
        include: [{ model: Lead, as: 'lead', attributes: ['id', 'title'] }],
      }],
      order: [['remindAt', 'ASC']],
      limit,
    })
    return res.json({ success: true, data: rows, meta: { limit } })
  } catch (e) {
    return next(e)
  }
}
