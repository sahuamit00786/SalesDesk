import Joi from 'joi'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import { parsePhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { Activity, CustomField, CustomFieldValue, Deal, Lead, PipelineStatus, Tag, User } from '../models/index.js'
import { serializeLeadCustomFields, upsertLeadCustomFields } from '../services/customFieldService.js'
import { serializeDealForClient } from './dealsController.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { resolveListWorkspaceFilterId } from '../utils/resolveListWorkspaceFilter.js'
import { findDuplicates, saveDuplicateRecord } from '../services/duplicateDetectionService.js'
import { logLeadFieldChanges } from '../services/leadFieldChangeActivity.js'
import { phoneDigitsKey } from '../utils/phoneDigits.js'
import { notifyOpportunityStageChanged } from '../services/notification/teamNotificationService.js'

function formatStageLabelForMessage(value) {
  const text = String(value || '').trim()
  if (!text) return '—'
  return text
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

async function resolveActorDisplayName(userId, emailFallback) {
  const u = await User.findByPk(userId, { attributes: ['name', 'email'] })
  const n = u?.name?.trim()
  if (n) return n
  return u?.email?.trim() || emailFallback || 'Someone'
}

/** Opportunity's assignee + owner, excluding whoever performed the action. */
function leadRecipients(opportunity, actorUserId) {
  const ids = new Set()
  if (opportunity.assignedTo) ids.add(String(opportunity.assignedTo))
  if (opportunity.ownerUserId) ids.add(String(opportunity.ownerUserId))
  ids.delete(String(actorUserId || ''))
  return [...ids]
}

/** @returns {{ phone: string|null, phoneCountryCode: string|null }} */
function splitPhoneFromClient(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return { phone: null, phoneCountryCode: null }
  try {
    const pn = parsePhoneNumber(s)
    if (pn?.isValid()) {
      return {
        phone: String(pn.nationalNumber || '').slice(0, 32) || null,
        phoneCountryCode: pn.countryCallingCode ? `+${pn.countryCallingCode}`.slice(0, 8) : null,
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const pn2 = parsePhoneNumberFromString(s)
    if (pn2?.nationalNumber) {
      return {
        phone: String(pn2.nationalNumber).slice(0, 32),
        phoneCountryCode: pn2.countryCallingCode ? `+${pn2.countryCallingCode}`.slice(0, 8) : null,
      }
    }
  } catch {
    /* fall through */
  }
  const compact = s.replace(/\s+/g, '')
  return { phone: compact.slice(0, 32) || null, phoneCountryCode: null }
}

async function assertLeadForOpportunity({ leadId, companyId, workspaceId }) {
  const leadRow = await Lead.findOne({
    where: { id: leadId, companyId, isDeleted: false },
  })
  if (!leadRow) {
    const err = new Error('Invalid lead')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'Invalid lead for this company'
    throw err
  }
  if (
    leadRow.workspaceId != null &&
    workspaceId != null &&
    String(leadRow.workspaceId) !== String(workspaceId)
  ) {
    const err = new Error('Lead belongs to a different workspace')
    err.status = 400
    err.code = 'VALIDATION'
    err.publicMessage = 'Lead belongs to a different workspace'
    throw err
  }
  return leadRow
}

const createOpportunitySchema = Joi.object({
  leadId: Joi.string().uuid().allow(null, ''),
  /** When set with pipelineDeal true, creates a Deal row linked to this funnel opportunity (flag kept for API compatibility). */
  fromOpportunityLeadId: Joi.string().uuid().allow(null, ''),
  ownerUserId: Joi.string().uuid().allow(null, ''),
  fullName: Joi.string().trim().max(255).when('fromOpportunityLeadId', {
    is: Joi.string().uuid(),
    then: Joi.string().trim().max(255).allow('', null),
    otherwise: Joi.required(),
  }),
  email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
  phoneNumber: Joi.string().trim().max(64).allow('', null),
  directPhone: Joi.string().trim().max(64).allow('', null),
  jobTitle: Joi.string().trim().max(160).allow('', null),
  companyName: Joi.string().trim().max(255).when('fromOpportunityLeadId', {
    is: Joi.string().uuid(),
    then: Joi.string().trim().max(255).allow('', null),
    otherwise: Joi.required(),
  }),
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
  /** Stored on `Lead.title`; shown as deal name on pipeline. */
  dealName: Joi.string().trim().max(255).allow('', null),
  /** Stored on `Lead.requirement` (TEXT). */
  dealDescription: Joi.string().trim().max(65535).allow('', null),
  /** ISO 4217, stored as `Lead.value_currency`. */
  dealCurrency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase().default('USD'),
  /** When true, row is shown on the Deals pipeline (not only Opportunities). */
  pipelineDeal: Joi.boolean().default(false),
  pipelineStatusId: Joi.string().uuid().allow('', null),
  customFields: Joi.object().default({}),
}).required()

const updateOpportunitySchema = createOpportunitySchema.fork(
  ['fullName', 'companyName', 'currentStage', 'dealName', 'dealDescription', 'dealCurrency', 'pipelineDeal'],
  (s) => s.optional(),
)

/** Default `Lead.title` when `dealName` is omitted (stored as pipeline deal label). */
function buildDefaultOpportunityTitle({ companyName, fullName }) {
  const co = String(companyName || '').trim()
  const fn = String(fullName || '').trim()
  let title = (co || fn || 'Pipeline lead').trim()
  if (title.length < 2) title = 'Pipeline lead'
  return title.slice(0, 255)
}

function parsePaging(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10))
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

async function ensureCompanyTags(companyId, tags = [], workspaceId = null) {
  const clean = [...new Set((tags || []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean))]
  if (!clean.length) return clean
  for (const name of clean) {
    const existing = await Tag.findOne({ where: { companyId, name } })
    if (!existing) {
      await Tag.create({ companyId, workspaceId, name, color: '#3b73f5' })
    }
  }
  return clean
}

async function resolveInitialPipelineStatus(workspaceId, companyId) {
  const initial = await PipelineStatus.findOne({
    where: { workspaceId, companyId, isInitial: true },
    order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
  })
  if (initial) return initial
  return PipelineStatus.findOne({
    where: { workspaceId, companyId },
    order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
  })
}

/** Visibility + workspace scope for pipeline rows (leads marked as opportunities). */
async function leadPipelineBaseWhere(req) {
  const accessWhere = await leadAccessWhere(req.user)
  const selectedWorkspaceId = resolveListWorkspaceFilterId(req)
  const allowedWorkspaceIds = await allowedWorkspaceIdsForUser(req.user)

  if (selectedWorkspaceId) {
    if (!allowedWorkspaceIds.includes(String(selectedWorkspaceId))) {
      const err = new Error('You do not have access to this workspace')
      err.status = 403
      err.code = 'FORBIDDEN'
      err.publicMessage = 'You do not have access to this workspace'
      throw err
    }
    return { ...accessWhere, workspaceId: String(selectedWorkspaceId), isDeleted: false, isOpportunity: true }
  }
  if (allowedWorkspaceIds.length && !req.user.isCompanyAdmin) {
    return { ...accessWhere, workspaceId: allowedWorkspaceIds, isDeleted: false, isOpportunity: true }
  }
  return { ...accessWhere, isDeleted: false, isOpportunity: true }
}

function serializeLeadAsOpportunity(lead) {
  const plain = lead.get ? lead.get({ plain: true }) : lead
  const tagRows = plain.tags || []
  const tags = tagRows.map((t) => String(t.name || t).trim().toLowerCase()).filter(Boolean)
  const ownerUser = plain.assignee || plain.owner
  const phoneNumber = [plain.phoneCountryCode, plain.phone].filter(Boolean).join(' ').trim() || null
  const directPhone = [plain.altPhoneCountryCode, plain.altPhone].filter(Boolean).join(' ').trim() || null
  return {
    id: plain.id,
    companyId: plain.companyId,
    workspaceId: plain.workspaceId,
    leadId: plain.id,
    ownerUserId: plain.assignedTo || plain.ownerUserId,
    createdBy: plain.ownerUserId,
    updatedBy: plain.ownerUserId,
    fullName: (plain.contactName || '').trim() || 'Lead',
    dealName: String(plain.title || '').trim() || null,
    dealDescription: String(plain.requirement || '').trim() || null,
    dealCurrency: normalizeDealCurrency(plain.valueCurrency),
    email: plain.email || null,
    phoneNumber,
    directPhone: directPhone || null,
    jobTitle: plain.designation || null,
    companyName: (plain.company || '').trim() || 'Unknown company',
    industry: null,
    companySize: null,
    employeeRange: null,
    website: null,
    linkedin: null,
    location: [plain.city, plain.state, plain.country].filter(Boolean).join(', ') || null,
    timezone: null,
    dealValue: plain.value,
    currentStage: plain.pipelineStatusInfo?.name || '',
    leadScore: plain.score,
    tags,
    lastActivityType: null,
    lastActivityText: null,
    lastActivityAt: null,
    isDeleted: plain.isDeleted,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    owner: ownerUser ? { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email } : null,
    customFields: plain.customFields || serializeLeadCustomFields(plain.customFieldValues || []),
  }
}

const leadPipelineIncludes = [
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
  { model: Tag, as: 'tags', attributes: ['id', 'name', 'color'], through: { attributes: [] }, required: false },
  { model: PipelineStatus, as: 'pipelineStatusInfo', attributes: ['id', 'name'], required: false },
  {
    model: CustomFieldValue,
    as: 'customFieldValues',
    include: [{ model: CustomField, as: 'customField', attributes: ['id', 'label', 'key', 'type', 'options', 'isRequired', 'order'] }],
    required: false,
  },
]

/** Pipeline data: `Lead` rows with `isOpportunity: true` only (no legacy opportunities table). */
export async function list(req, res, next) {
  try {
    const { page, limit, offset } = parsePaging(req.query)
    const baseWhere = await leadPipelineBaseWhere(req)

    const stages = parseCsvParam(req.query.stage)
    if (stages.length === 1) baseWhere.pipelineStatus = stages[0]
    else if (stages.length > 1) baseWhere.pipelineStatus = { [Op.in]: stages }

    const ownerUserIds = parseCsvParam(req.query.ownerUserId)
    if (ownerUserIds.length === 1) baseWhere.assignedTo = ownerUserIds[0]
    else if (ownerUserIds.length > 1) baseWhere.assignedTo = { [Op.in]: ownerUserIds }

    const andParts = [baseWhere]
    const search = String(req.query.search || '').trim()
    if (search) {
      const q = `%${search.toLowerCase()}%`
      andParts.push({
        [Op.or]: [
          sqlWhere(fn('LOWER', col('Lead.contact_name')), { [Op.like]: q }),
          sqlWhere(fn('LOWER', col('Lead.title')), { [Op.like]: q }),
          sqlWhere(fn('LOWER', col('Lead.company')), { [Op.like]: q }),
          sqlWhere(fn('LOWER', col('Lead.email')), { [Op.like]: q }),
          sqlWhere(fn('LOWER', col('Lead.designation')), { [Op.like]: q }),
          sqlWhere(fn('LOWER', col('Lead.phone')), { [Op.like]: q }),
        ],
      })
    }

    const where = andParts.length === 1 ? andParts[0] : { [Op.and]: andParts }

    const sortKey = String(req.query.sort || 'updatedAt').trim()
    const orderDir = String(req.query.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    const sortMap = {
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      dealValue: 'value',
      fullName: 'contactName',
      companyName: 'company',
      leadScore: 'score',
      currentStage: 'createdAt',
    }
    const orderCol = sortMap[sortKey] || 'updatedAt'

    const { rows, count } = await Lead.findAndCountAll({
      where,
      include: leadPipelineIncludes,
      order: [[orderCol, orderDir]],
      limit,
      offset,
      distinct: true,
      col: 'id',
    })
    return res.json({
      success: true,
      data: rows.map(serializeLeadAsOpportunity),
      meta: { total: count, page, limit },
    })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req, res, next) {
  try {
    const baseWhere = await leadPipelineBaseWhere(req)
    const lead = await Lead.findOne({
      where: { ...baseWhere, id: req.params.id },
      include: leadPipelineIncludes,
    })
    if (lead) {
      return res.json({ success: true, data: serializeLeadAsOpportunity(lead), meta: {} })
    }

    const err = new Error('Opportunity not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    err.publicMessage = 'Opportunity not found'
    throw err
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

    const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId
    if (!workspaceId) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage = 'workspaceId is required'
      throw err
    }

    const normalizedTags = await ensureCompanyTags(req.user.companyId, value.tags, String(workspaceId))
    const normalizedFromOppId = normalizeNullable(value.fromOpportunityLeadId)

    if (normalizedFromOppId) {
      if (!value.pipelineDeal) {
        const err = new Error('Validation failed')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'fromOpportunityLeadId requires pipelineDeal to be true'
        throw err
      }
      const parent = await assertLeadForOpportunity({
        leadId: normalizedFromOppId,
        companyId: req.user.companyId,
        workspaceId: String(workspaceId),
      })
      if (!parent.isOpportunity) {
        const err = new Error('Validation failed')
        err.status = 400
        err.code = 'VALIDATION'
        err.publicMessage = 'Selected lead must be an opportunity'
        throw err
      }
      const initialStatus = await resolveInitialPipelineStatus(String(workspaceId), req.user.companyId)
      const dealStage = initialStatus?.name || ''
      const ownerId = normalizeNullable(value.ownerUserId) || parent.assignedTo || req.user.id
      const fullName = String(value.fullName || '').trim() || parent.contactName || 'Lead'
      const companyName = String(value.companyName || '').trim() || parent.company || 'Unknown company'
      const explicitTitle = String(value.dealName || '').trim().slice(0, 255)
      const title = explicitTitle || buildDefaultOpportunityTitle({ companyName, fullName })
      const reqDesc =
        value.dealDescription !== undefined
          ? normalizeNullable(value.dealDescription)
          : null
      const dealCurrency = normalizeDealCurrency(
        value.dealCurrency !== undefined ? value.dealCurrency : parent.valueCurrency,
      )
      const deal = await Deal.create({
        workspaceId: String(workspaceId),
        companyId: req.user.companyId,
        opportunityLeadId: normalizedFromOppId,
        name: title,
        description: reqDesc,
        value: value.dealValue !== undefined ? value.dealValue : Number(parent.value ?? 0),
        valueCurrency: dealCurrency,
        stage: dealStage,
        assignedTo: ownerId,
        ownerUserId: req.user.id,
        isDeleted: false,
      })

      await deal.reload({
        include: [
          {
            model: Lead,
            as: 'opportunity',
            attributes: ['id', 'title', 'contactName', 'company', 'email', 'phone', 'phoneCountryCode', 'designation', 'score'],
            required: true,
          },
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false },
        ],
      })
      const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
      await Activity.create({
        type: 'system',
        body: `Deal created from opportunity by ${actorName}`,
        metadata: {
          action: 'deal_created',
          dealId: deal.id,
          parentOpportunityLeadId: normalizedFromOppId,
          actorUserId: req.user.id,
          activityTypeKey: 'system',
          title: 'Deal created',
        },
        leadId: normalizedFromOppId,
        userId: req.user.id,
      })

      return res.status(201).json({ success: true, data: serializeDealForClient(deal), meta: {} })
    }

    const normalizedLeadId = normalizeNullable(value.leadId)
    const requestedStatusId = value.pipelineStatusId ? String(value.pipelineStatusId).trim() : null
    const initialStatus = requestedStatusId
      ? await PipelineStatus.findOne({ where: { id: requestedStatusId, workspaceId: String(workspaceId), companyId: req.user.companyId } })
      : await resolveInitialPipelineStatus(String(workspaceId), req.user.companyId)

    if (normalizedLeadId) {
      const leadRow = await assertLeadForOpportunity({
        leadId: normalizedLeadId,
        companyId: req.user.companyId,
        workspaceId: String(workspaceId),
      })

      if (leadRow.isOpportunity) {
        await leadRow.reload({ include: leadPipelineIncludes })
        return res.status(200).json({ success: true, data: serializeLeadAsOpportunity(leadRow), meta: {} })
      }

      const ownerId = normalizeNullable(value.ownerUserId) || leadRow.assignedTo || req.user.id
      const splitPhone =
        value.phoneNumber !== undefined && String(value.phoneNumber || '').trim()
          ? splitPhoneFromClient(value.phoneNumber)
          : null
      const convertUpdates = {
        isOpportunity: true,
        pipelineStatus: initialStatus?.id || null,
        assignedTo: ownerId,
        contactName: value.fullName?.trim() || leadRow.contactName,
        company: value.companyName?.trim() || leadRow.company,
        email: value.email !== undefined ? normalizeNullable(value.email) : leadRow.email,
        designation: value.jobTitle !== undefined ? normalizeNullable(value.jobTitle) : leadRow.designation,
        value: value.dealValue !== undefined ? value.dealValue : leadRow.value,
        score: value.leadScore !== undefined ? value.leadScore : leadRow.score,
        phone:
          value.phoneNumber !== undefined
            ? splitPhone
              ? splitPhone.phone
              : null
            : leadRow.phone,
        phoneCountryCode:
          value.phoneNumber !== undefined ? (splitPhone ? splitPhone.phoneCountryCode : null) : leadRow.phoneCountryCode,
      }
      if (value.dealName !== undefined) {
        const raw = String(value.dealName || '').trim()
        convertUpdates.title = raw
          ? raw.slice(0, 255)
          : buildDefaultOpportunityTitle({
              companyName: value.companyName?.trim() || leadRow.company,
              fullName: value.fullName?.trim() || leadRow.contactName,
            })
      }
      if (value.dealDescription !== undefined) {
        convertUpdates.requirement = normalizeNullable(value.dealDescription)
      }
      if (value.dealCurrency !== undefined) {
        convertUpdates.valueCurrency = normalizeDealCurrency(value.dealCurrency)
      }
      await leadRow.update(convertUpdates)

      if (normalizedTags.length) {
        const tags = await Promise.all(
          normalizedTags.map(async (name) => {
            const existing = await Tag.findOne({ where: { companyId: req.user.companyId, name } })
            if (existing) return existing
            return Tag.create({ name, companyId: req.user.companyId, workspaceId: String(workspaceId) })
          }),
        )
        await leadRow.setTags(tags)
      }

      await upsertLeadCustomFields({
        leadId: leadRow.id,
        workspaceId: String(workspaceId),
        companyId: req.user.companyId,
        customFields: value.customFields || {},
      })

      await leadRow.reload({ include: leadPipelineIncludes })
      const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
      await Activity.create({
        type: 'system',
        body: `Converted to opportunity by ${actorName}`,
        metadata: {
          action: 'converted_to_opportunity',
          opportunityId: leadRow.id,
          actorUserId: req.user.id,
          activityTypeKey: 'system',
          title: 'Converted to opportunity',
        },
        leadId: leadRow.id,
        userId: req.user.id,
      })

      for (const uid of leadRecipients(leadRow, req.user.id)) {
        notifyOpportunityStageChanged({
          companyId: req.user.companyId,
          workspaceId: leadRow.workspaceId,
          recipientUserId: uid,
          actorUserId: req.user.id,
          leadId: leadRow.id,
          opportunityName: leadRow.title || leadRow.contactName,
          stage: leadRow.opportunityStage || leadRow.pipelineStatus,
          created: true,
        }).catch(() => {})
      }

      return res.status(201).json({ success: true, data: serializeLeadAsOpportunity(leadRow), meta: {} })
    }

    /** Do not create orphan “deals”: pipeline rows must link to a funnel opportunity (`fromOpportunityLeadId`) or convert an existing lead (`leadId`). */
    if (value.pipelineDeal) {
      const err = new Error('Validation failed')
      err.status = 400
      err.code = 'VALIDATION'
      err.publicMessage =
        'Pipeline deals must be tied to a funnel opportunity. Create the deal from the opportunity (or send fromOpportunityLeadId), or convert an existing lead with leadId.'
      throw err
    }

    const dupPhone = String(value.phoneNumber || '').trim()
      ? splitPhoneFromClient(value.phoneNumber).phone
      : null
    const dupes = await findDuplicates(String(workspaceId), {
      email: normalizeNullable(value.email),
      phone: dupPhone,
    })
    if (dupes.length) {
      await saveDuplicateRecord({
        leadData: {
          contactName: value.fullName || null,
          company: value.companyName || null,
          email: value.email || null,
          phone: dupPhone,
          designation: value.jobTitle || null,
          value: value.dealValue || 0,
          valueCurrency: value.dealCurrency || 'USD',
          requirement: value.dealDescription || null,
          tags: normalizedTags,
          pipelineStatus: initialStatus?.id || null,
          isOpportunity: true,
          source: 'manual',
        },
        dupes,
        source: 'opportunity',
        workspaceId: String(workspaceId),
        companyId: req.user.companyId,
        createdByUserId: req.user.id,
      })
      return res.status(202).json({
        success: true,
        queued: true,
        message: 'Potential duplicate detected. Opportunity saved to duplicate review queue.',
        duplicates: dupes,
        meta: {},
      })
    }

    const explicitTitle = String(value.dealName || '').trim().slice(0, 255)
    const title = explicitTitle || buildDefaultOpportunityTitle({ companyName: value.companyName, fullName: value.fullName })
    const ownerId = normalizeNullable(value.ownerUserId) || req.user.id

    const { phone: newPhone, phoneCountryCode: newPhoneCc } = value.phoneNumber?.trim()
      ? splitPhoneFromClient(value.phoneNumber)
      : { phone: null, phoneCountryCode: null }

    const lead = await Lead.create({
      title,
      contactName: value.fullName?.trim() || null,
      company: value.companyName?.trim() || null,
      email: normalizeNullable(value.email),
      phone: newPhone,
      phoneCountryCode: newPhoneCc,
      designation: normalizeNullable(value.jobTitle),
      value: value.dealValue ?? 0,
      score: value.leadScore ?? 0,
      requirement: value.dealDescription !== undefined ? normalizeNullable(value.dealDescription) : null,
      valueCurrency: normalizeDealCurrency(value.dealCurrency),
      status: 'new',
      source: 'manual',
      ownerUserId: req.user.id,
      assignedTo: ownerId,
      workspaceId: String(workspaceId),
      companyId: req.user.companyId,
      isDeleted: false,
      isOpportunity: true,
      pipelineStatus: initialStatus?.id || null,
      phoneDigits: phoneDigitsKey(newPhone) || null,
    })

    if (normalizedTags.length) {
      const tags = await Promise.all(
        normalizedTags.map(async (name) => {
          const existing = await Tag.findOne({ where: { companyId: req.user.companyId, name } })
          if (existing) return existing
          return Tag.create({ name, companyId: req.user.companyId, workspaceId: String(workspaceId) })
        }),
      )
      await lead.setTags(tags)
    }

    await upsertLeadCustomFields({
      leadId: lead.id,
      workspaceId: String(workspaceId),
      companyId: req.user.companyId,
      customFields: value.customFields || {},
    })

    await lead.reload({ include: leadPipelineIncludes })
    for (const uid of leadRecipients(lead, req.user.id)) {
      notifyOpportunityStageChanged({
        companyId: req.user.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: uid,
        actorUserId: req.user.id,
        leadId: lead.id,
        opportunityName: lead.title || lead.contactName,
        stage: lead.opportunityStage || lead.pipelineStatus,
        created: true,
      }).catch(() => {})
    }
    return res.status(201).json({ success: true, data: serializeLeadAsOpportunity(lead), meta: {} })
  } catch (e) {
    if (e?.status === 400) {
      return res.status(400).json({ success: false, error: { code: e.code || 'VALIDATION', message: e.message } })
    }
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

    const baseWhere = await leadPipelineBaseWhere(req)
    let lead = await Lead.findOne({ where: { ...baseWhere, id: req.params.id } })
    if (lead) {
      const hasTagsField = Object.prototype.hasOwnProperty.call(req.body || {}, 'tags')
      const hasCustomFieldsField = Object.prototype.hasOwnProperty.call(req.body || {}, 'customFields')
      const beforePlain = lead.get({ plain: true })
      const beforeTags = (await lead.getTags({ attributes: ['name'] })).map((t) => String(t.name || '').trim().toLowerCase()).filter(Boolean)

      const patch = {}
      if (value.fullName !== undefined) patch.contactName = value.fullName?.trim() || lead.contactName
      if (value.companyName !== undefined) patch.company = value.companyName?.trim() || lead.company
      if (value.email !== undefined) patch.email = normalizeNullable(value.email)
      if (value.jobTitle !== undefined) patch.designation = normalizeNullable(value.jobTitle)
      if (value.dealValue !== undefined) patch.value = value.dealValue
      if (value.leadScore !== undefined) patch.score = value.leadScore
      if (value.ownerUserId !== undefined) patch.assignedTo = normalizeNullable(value.ownerUserId)
      if (value.phoneNumber !== undefined) {
        const t = String(value.phoneNumber ?? '').trim()
        if (!t) {
          patch.phone = null
          patch.phoneCountryCode = null
        } else {
          const sp = splitPhoneFromClient(value.phoneNumber)
          patch.phone = sp.phone
          patch.phoneCountryCode = sp.phoneCountryCode
        }
      }
      if (value.dealName !== undefined) {
        const raw = String(value.dealName || '').trim()
        const co = value.companyName !== undefined ? value.companyName?.trim() : lead.company
        const fn = value.fullName !== undefined ? value.fullName?.trim() : lead.contactName
        patch.title = raw.slice(0, 255) || buildDefaultOpportunityTitle({ companyName: co, fullName: fn })
      }
      if (value.dealDescription !== undefined) patch.requirement = normalizeNullable(value.dealDescription)
      if (value.dealCurrency !== undefined) patch.valueCurrency = normalizeDealCurrency(value.dealCurrency)

      await lead.update(patch)

      if (value.tags !== undefined) {
        const normalizedTags = await ensureCompanyTags(
          req.user.companyId,
          value.tags,
          lead.workspaceId || req.headers['x-workspace-id'] || null,
        )
        const tags = await Promise.all(
          normalizedTags.map(async (name) => {
            const existing = await Tag.findOne({ where: { companyId: req.user.companyId, name } })
            if (existing) return existing
            return Tag.create({ name, companyId: req.user.companyId, workspaceId: lead.workspaceId })
          }),
        )
        await lead.setTags(tags)
      }

      if (hasCustomFieldsField) {
        await upsertLeadCustomFields({
          leadId: lead.id,
          workspaceId: lead.workspaceId,
          companyId: lead.companyId,
          customFields: value.customFields || {},
        })
      }

      await lead.reload({ include: leadPipelineIncludes })

      if (hasTagsField) {
        const afterTags = (await lead.getTags({ attributes: ['name'] })).map((t) => String(t.name || '').trim().toLowerCase()).filter(Boolean)
        const added = afterTags.filter((tag) => !beforeTags.includes(tag))
        if (added.length) {
          const tagRows = await Tag.findAll({ where: { companyId: req.user.companyId, name: { [Op.in]: added } } })
          const addedDetails = added.map((name) => {
            const rowTag = tagRows.find((t) => String(t.name || '').trim().toLowerCase() === name)
            return { name, color: rowTag?.color || '#3b73f5' }
          })
          const detailText = addedDetails.map((t) => `${t.name} (${t.color})`).join(', ')
          const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
          await Activity.create({
            type: 'system',
            body: `Opportunity tag added by ${actorName}: ${detailText}`,
            metadata: {
              action: 'opportunity_tags_added',
              activityTypeKey: 'tag',
              opportunityId: lead.id,
              added: addedDetails,
              actorUserId: req.user.id,
            },
            leadId: lead.id,
            userId: req.user.id,
          })
        }
      }

      const actorForFields = await resolveActorDisplayName(req.user.id, req.user.email)
      await logLeadFieldChanges({
        before: beforePlain,
        after: lead.get({ plain: true }),
        leadId: lead.id,
        userId: req.user.id,
        actorName: actorForFields,
      })

      return res.json({ success: true, data: serializeLeadAsOpportunity(lead), meta: {} })
    }

    const err = new Error('Opportunity not found')
    err.status = 404
    err.code = 'NOT_FOUND'
    err.publicMessage = 'Opportunity not found'
    throw err
  } catch (e) {
    if (e?.status === 400) {
      return res.status(400).json({ success: false, error: { code: e.code || 'VALIDATION', message: e.message } })
    }
    return next(e)
  }
}

export async function patchStatus(req, res, next) {
  try {
    const pipelineStatusId = String(req.body?.pipelineStatusId || '').trim()
    if (!pipelineStatusId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'pipelineStatusId is required' } })
    }

    const workspaceId = req.headers['x-workspace-id']
    const companyId = req.user?.companyId
    const newStatus = await PipelineStatus.findOne({ where: { id: pipelineStatusId, companyId } })
    if (!newStatus) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pipeline status not found' } })
    }

    const baseWhere = await leadPipelineBaseWhere(req)
    const lead = await Lead.findOne({
      where: { ...baseWhere, id: req.params.id },
      include: leadPipelineIncludes,
    })
    if (!lead) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Opportunity not found' } })
    }

    const prevStatusId = lead.pipelineStatus
    if (String(prevStatusId) === pipelineStatusId) {
      return res.json({ success: true, data: serializeLeadAsOpportunity(lead), meta: {} })
    }

    const prevStatus = prevStatusId
      ? await PipelineStatus.findOne({ where: { id: prevStatusId, companyId }, attributes: ['name'] })
      : null

    await lead.update({ pipelineStatus: pipelineStatusId })
    await lead.reload({ include: leadPipelineIncludes })

    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    await Activity.create({
      type: 'status_change',
      body: `Pipeline status changed from ${formatStageLabelForMessage(prevStatus?.name || '')} to ${formatStageLabelForMessage(newStatus.name)} by ${actorName}`,
      metadata: {
        action: 'pipeline_status_changed',
        opportunityId: lead.id,
        from: prevStatus?.name || '',
        to: newStatus.name,
        actorUserId: req.user.id,
      },
      leadId: lead.id,
      userId: req.user.id,
    })

    for (const uid of leadRecipients(lead, req.user.id)) {
      notifyOpportunityStageChanged({
        companyId: req.user.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: uid,
        actorUserId: req.user.id,
        leadId: lead.id,
        opportunityName: lead.title || lead.contactName,
        stage: newStatus.name,
        created: false,
      }).catch(() => {})
    }

    return res.json({ success: true, data: serializeLeadAsOpportunity(lead), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function revertToLead(req, res, next) {
  try {
    const baseWhere = await leadPipelineBaseWhere(req)
    const lead = await Lead.findOne({ where: { ...baseWhere, id: req.params.id } })
    if (!lead) {
      const err = new Error('Opportunity not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Opportunity not found'
      throw err
    }

    const linkedDealCount = await Deal.count({ where: { opportunityLeadId: lead.id, isDeleted: false } })
    if (linkedDealCount) {
      return res.status(400).json({
        success: false,
        error: { code: 'HAS_DEALS', message: 'Remove or archive linked deals before reverting this opportunity to a lead.' },
      })
    }

    await lead.update({ isOpportunity: false, pipelineStatus: null })
    await lead.reload({ include: leadPipelineIncludes })

    const actorName = await resolveActorDisplayName(req.user.id, req.user.email)
    await Activity.create({
      type: 'system',
      body: `Reverted to lead by ${actorName}`,
      metadata: {
        action: 'reverted_to_lead',
        leadId: lead.id,
        actorUserId: req.user.id,
        activityTypeKey: 'system',
        title: 'Reverted to lead',
      },
      leadId: lead.id,
      userId: req.user.id,
    })

    return res.json({ success: true, data: serializeLeadAsOpportunity(lead), meta: {} })
  } catch (e) {
    if (e?.status === 400 || e?.status === 404) {
      return res.status(e.status).json({ success: false, error: { code: e.code || 'VALIDATION', message: e.publicMessage || e.message } })
    }
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const baseWhere = await leadPipelineBaseWhere(req)
    const lead = await Lead.findOne({ where: { ...baseWhere, id: req.params.id } })
    if (!lead) {
      const err = new Error('Opportunity not found')
      err.status = 404
      err.code = 'NOT_FOUND'
      err.publicMessage = 'Opportunity not found'
      throw err
    }
    await lead.update({ isDeleted: true })
    await lead.destroy()
    return res.json({ success: true, data: { id: lead.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
