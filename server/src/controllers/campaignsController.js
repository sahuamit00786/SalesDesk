import Joi from 'joi'
import { Op, literal } from 'sequelize'
import { sequelize, Campaign, CampaignTeamMember, CampaignLead, Lead, User } from '../models/index.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import {
  collectCampaignRecipients,
  notifyCampaignLeadsBatch,
} from '../services/notification/teamNotificationService.js'

export const DEFAULT_CAMPAIGN_STAGES = [
  { key: 'new', label: 'New', sortOrder: 0 },
  { key: 'contacted', label: 'Contacted', sortOrder: 1 },
  { key: 'qualified', label: 'Qualified', sortOrder: 2 },
  { key: 'converted', label: 'Converted', sortOrder: 3 },
]

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().allow('', null).max(65535),
  status: Joi.string().valid('active', 'inactive', 'draft').default('active'),
  leadIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  teamUserIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  /** If true and lead.assignedTo is in teamUserIds, use that user; else round-robin team. */
  preferExistingTeamAssignee: Joi.boolean().default(false),
  /** If true, do not update `leads.assigned_to` — only store campaign_leads.assigned_user_id */
  skipUpdatingLeadAssignedTo: Joi.boolean().default(false),
  /** Optional campaign amount goal (displayed on campaign detail KPIs). */
  leadTarget: Joi.number().min(0).precision(2).max(999999999999.99).allow(null).optional(),
  endDate: Joi.date().iso().allow(null, '').optional(),
}).required()

function parseOptionalDateOnly(value) {
  if (value == null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function assertWorkspace(req, workspaceId) {
  const wid = String(workspaceId || '').trim()
  if (!wid) {
    const err = new Error('workspaceId is required')
    err.status = 400
    err.code = 'VALIDATION'
    throw err
  }
  return wid
}

async function assertWorkspaceAccess(req, workspaceId) {
  const wid = assertWorkspace(req, workspaceId)
  const allowed = await allowedWorkspaceIdsForUser(req.user)
  if (allowed.length && !allowed.includes(wid) && !req.user.isCompanyAdmin) {
    const err = new Error('No access to workspace')
    err.status = 403
    err.code = 'FORBIDDEN'
    throw err
  }
  return wid
}

async function loadCampaignForCompany(id, companyId) {
  const row = await Campaign.findOne({
    where: { id, companyId },
    include: [
      { model: CampaignTeamMember, as: 'teamMembers', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
    ],
  })
  return row
}

export async function list(req, res, next) {
  try {
    const workspaceId = assertWorkspace(req, req.headers['x-workspace-id'])
    await assertWorkspaceAccess(req, workspaceId)
    const status = String(req.query.status || '').trim().toLowerCase()
    const where = { workspaceId, companyId: req.user.companyId }
    if (status && ['active', 'inactive', 'draft'].includes(status)) where.status = status
    const kind = req.user.userRoleKind
    const isSalesOnly = !req.user.isCompanyAdmin && kind !== 'workspace_admin' && kind !== 'manager'
    if (isSalesOnly) {
      const memberOf = await CampaignTeamMember.findAll({
        where: { userId: req.user.id },
        attributes: ['campaignId'],
      })
      const memberCampaignIds = memberOf.map((m) => m.campaignId)
      where[Op.or] = [{ createdBy: req.user.id }, { id: { [Op.in]: memberCampaignIds } }]
    }
    const rows = await Campaign.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 200,
      include: [{ model: CampaignTeamMember, as: 'teamMembers', attributes: ['userId'], required: false }],
    })
    const ids = rows.map((r) => r.id)
    const countsByCampaign = new Map()
    if (ids.length) {
      const countWhere = { campaignId: { [Op.in]: ids } }
      const countInclude = [{ model: Lead, as: 'lead', attributes: [], required: true, where: { isDeleted: false } }]
      if (isSalesOnly) {
        countWhere[Op.or] = [{ assignedUserId: req.user.id }, { '$lead.assigned_to$': req.user.id }]
      }
      const agg = await CampaignLead.findAll({
        attributes: ['campaignId', 'stageKey', [literal('COUNT(*)'), 'cnt']],
        where: countWhere,
        include: countInclude,
        group: ['campaignId', 'stageKey'],
        raw: true,
      })
      for (const row of agg) {
        const cid = String(row.campaignId)
        if (!countsByCampaign.has(cid)) countsByCampaign.set(cid, {})
        const m = countsByCampaign.get(cid)
        m[String(row.stageKey)] = Number(row.cnt) || 0
      }
    }
    const data = rows.map((c) => {
      const plain = c.get({ plain: true })
      const stages = Array.isArray(plain.stages) ? plain.stages : DEFAULT_CAMPAIGN_STAGES
      const stageCounts = countsByCampaign.get(String(plain.id)) || {}
      const metrics = stages.slice(0, 4).map((s) => ({
        key: s.key,
        label: s.label,
        count: Number(stageCounts[s.key] || 0),
      }))
      const totalLeads = Object.values(stageCounts).reduce((a, b) => a + b, 0)
      const teamCount = Array.isArray(plain.teamMembers) ? plain.teamMembers.length : 0
      return {
        ...plain,
        teamMembers: undefined,
        teamCount,
        totalLeads,
        stageCounts,
        metrics,
      }
    })
    return res.json({ success: true, data, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function create(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const { error, value } = createSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const teamSet = new Set(value.teamUserIds.map(String))
    const accessWhere = await leadAccessWhere(req.user)
    const leads = await Lead.findAll({
      where: {
        ...accessWhere,
        id: { [Op.in]: value.leadIds },
        workspaceId,
        companyId: req.user.companyId,
        isDeleted: false,
      },
    })
    if (leads.length !== value.leadIds.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Some leads were not found or you cannot access them in this workspace.' },
      })
    }
    const usersOk = await User.count({
      where: { id: { [Op.in]: [...teamSet] }, companyId: req.user.companyId },
    })
    if (usersOk !== teamSet.size) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid team user selection.' } })
    }

    const campaignLeadRows = []
    const campaign = await sequelize.transaction(async (transaction) => {
      const c = await Campaign.create(
        {
          workspaceId,
          companyId: req.user.companyId,
          name: value.name.trim(),
          description: value.description ? String(value.description).trim() : null,
          leadTarget: value.leadTarget != null ? value.leadTarget : null,
          endDate: parseOptionalDateOnly(value.endDate),
          stages: DEFAULT_CAMPAIGN_STAGES,
          status: value.status,
          preferExistingTeamAssignee: Boolean(value.preferExistingTeamAssignee),
          skipUpdatingLeadAssignedTo: Boolean(value.skipUpdatingLeadAssignedTo),
          createdBy: req.user.id,
        },
        { transaction },
      )
      await CampaignTeamMember.bulkCreate(
        [...teamSet].map((userId) => ({ campaignId: c.id, userId })),
        { transaction },
      )
      let rr = 0
      const teamArr = [...teamSet]
      const rows = []
      for (const lead of leads) {
        let assignedUserId = null
        if (value.preferExistingTeamAssignee && lead.assignedTo && teamSet.has(String(lead.assignedTo))) {
          assignedUserId = lead.assignedTo
        } else {
          assignedUserId = teamArr[rr % teamArr.length]
          rr += 1
        }
        rows.push({
          campaignId: c.id,
          leadId: lead.id,
          stageKey: 'new',
          assignedUserId,
        })
        if (!value.skipUpdatingLeadAssignedTo && assignedUserId) {
          await lead.update({ assignedTo: assignedUserId }, { transaction })
        }
      }
      await CampaignLead.bulkCreate(rows, { transaction })
      campaignLeadRows.push(...rows)
      return c
    })
    const campaignCounts = collectCampaignRecipients(campaignLeadRows, req.user.id)
    notifyCampaignLeadsBatch({
      companyId: req.user.companyId,
      workspaceId,
      actorUserId: req.user.id,
      campaignId: campaign.id,
      campaignName: campaign.name,
      countByUserId: campaignCounts,
    }).catch(() => {})
    const full = await loadCampaignForCompany(campaign.id, req.user.companyId)
    return res.status(201).json({ success: true, data: full.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getOne(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const row = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
      include: [
        {
          model: CampaignTeamMember,
          as: 'teamMembers',
          required: false,
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        },
      ],
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })
    const stages = Array.isArray(row.stages) ? row.stages : DEFAULT_CAMPAIGN_STAGES
    const detailKind = req.user.userRoleKind
    const detailSalesOnly = !req.user.isCompanyAdmin && detailKind !== 'workspace_admin' && detailKind !== 'manager'
    const funnelWhere = { campaignId: row.id }
    const funnelInclude = [{ model: Lead, as: 'lead', attributes: [], required: true, where: { isDeleted: false } }]
    if (detailSalesOnly) {
      funnelWhere[Op.or] = [{ assignedUserId: req.user.id }, { '$lead.assigned_to$': req.user.id }]
    }
    const agg = await CampaignLead.findAll({
      attributes: ['stageKey', [literal('COUNT(*)'), 'cnt']],
      where: funnelWhere,
      include: funnelInclude,
      group: ['stageKey'],
      raw: true,
    })
    const amountAgg = await CampaignLead.findAll({
      attributes: [[literal('COALESCE(SUM(`lead`.`value`), 0)'), 'totalAmount']],
      where: detailSalesOnly ? funnelWhere : { campaignId: row.id },
      include: [{ model: Lead, as: 'lead', attributes: [], required: true, where: { isDeleted: false } }],
      raw: true,
    })
    const stageCounts = {}
    for (const a of agg) stageCounts[String(a.stageKey)] = Number(a.cnt) || 0
    const funnel = stages.map((s) => ({ ...s, count: Number(stageCounts[s.key] || 0) }))
    const totalAmount = Number(amountAgg?.[0]?.totalAmount || 0)
    const plain = row.get({ plain: true })
    return res.json({ success: true, data: { ...plain, stages, funnel, stageCounts, totalAmount }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function listLeads(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })

    const stageKey = String(req.query.stageKey || '').trim()
    const assignedUserId = String(req.query.assignedUserId || '').trim()
    const isOpportunity = String(req.query.isOpportunity || '').toLowerCase()
    const q = String(req.query.q || '').trim()

    const clWhere = { campaignId: campaign.id }
    if (stageKey) clWhere.stageKey = stageKey
    if (assignedUserId && /^[0-9a-f-]{36}$/i.test(assignedUserId)) clWhere.assignedUserId = assignedUserId

    const clKind = req.user.userRoleKind
    const isSalesOnlyLeads = !req.user.isCompanyAdmin && clKind !== 'workspace_admin' && clKind !== 'manager'
    if (isSalesOnlyLeads && !assignedUserId) {
      // Sales sees only campaign leads assigned to them (campaign-level OR lead-level)
      clWhere[Op.or] = [
        { assignedUserId: req.user.id },
        { '$lead.assigned_to$': req.user.id },
      ]
    }

    const leadWhere = { isDeleted: false }
    if (isOpportunity === 'true') leadWhere.isOpportunity = true
    if (isOpportunity === 'false') leadWhere.isOpportunity = false
    if (q) {
      leadWhere[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { contactName: { [Op.like]: `%${q}%` } },
        { company: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ]
    }

    const rows = await CampaignLead.findAll({
      where: clWhere,
      include: [
        {
          model: Lead,
          as: 'lead',
          required: true,
          where: leadWhere,
          include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'], required: false }],
        },
        { model: User, as: 'campaignAssignee', attributes: ['id', 'name', 'email'], required: false },
      ],
      order: [['createdAt', 'ASC']],
      limit: 500,
    })

    const data = rows.map((r) => {
      const p = r.get({ plain: true })
      const lead = p.lead || {}
      return {
        campaignLeadId: p.id,
        stageKey: p.stageKey,
        campaignAssignee: p.campaignAssignee,
        lead: {
          id: lead.id,
          title: lead.title,
          contactName: lead.contactName,
          company: lead.company,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          status: lead.status,
          isOpportunity: lead.isOpportunity,
          opportunityStage: lead.opportunityStage,
          assignedTo: lead.assignedTo,
          leadAssignee: lead.assignee,
          createdAt: lead.createdAt,
        },
      }
    })
    return res.json({ success: true, data, meta: {} })
  } catch (e) {
    return next(e)
  }
}

const patchLeadStageSchema = Joi.object({
  stageKey: Joi.string().trim().min(1).max(64).required(),
}).required()

const patchCampaignSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().allow('', null).max(65535).optional(),
  leadTarget: Joi.number().min(0).precision(2).max(999999999999.99).allow(null).optional(),
  endDate: Joi.date().iso().allow(null, '').optional(),
  status: Joi.string().valid('active', 'inactive', 'draft').optional(),
  teamUserIds: Joi.array().items(Joi.string().uuid()).min(1).optional(),
  preferExistingTeamAssignee: Joi.boolean().optional(),
  skipUpdatingLeadAssignedTo: Joi.boolean().optional(),
})
  .or(
    'name',
    'description',
    'leadTarget',
    'endDate',
    'status',
    'teamUserIds',
    'preferExistingTeamAssignee',
    'skipUpdatingLeadAssignedTo',
  )
  .required()

export async function patchCampaign(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const { error, value } = patchCampaignSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }

    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })
    }

    const nextPatch = {}
    if (Object.prototype.hasOwnProperty.call(value, 'name')) nextPatch.name = value.name.trim()
    if (Object.prototype.hasOwnProperty.call(value, 'description')) {
      const desc = value.description == null ? null : String(value.description).trim()
      nextPatch.description = desc || null
    }
    if (Object.prototype.hasOwnProperty.call(value, 'leadTarget')) {
      nextPatch.leadTarget = value.leadTarget == null ? null : value.leadTarget
    }
    if (Object.prototype.hasOwnProperty.call(value, 'endDate')) {
      nextPatch.endDate = parseOptionalDateOnly(value.endDate)
    }
    if (Object.prototype.hasOwnProperty.call(value, 'status')) nextPatch.status = value.status
    if (Object.prototype.hasOwnProperty.call(value, 'preferExistingTeamAssignee')) {
      nextPatch.preferExistingTeamAssignee = Boolean(value.preferExistingTeamAssignee)
    }
    if (Object.prototype.hasOwnProperty.call(value, 'skipUpdatingLeadAssignedTo')) {
      nextPatch.skipUpdatingLeadAssignedTo = Boolean(value.skipUpdatingLeadAssignedTo)
    }

    if (Object.keys(nextPatch).length) {
      await campaign.update(nextPatch)
    }

    if (Object.prototype.hasOwnProperty.call(value, 'teamUserIds')) {
      const teamSet = new Set(value.teamUserIds.map(String))
      const usersOk = await User.count({
        where: { id: { [Op.in]: [...teamSet] }, companyId: req.user.companyId },
      })
      if (usersOk !== teamSet.size) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid team user selection.' } })
      }
      await sequelize.transaction(async (transaction) => {
        await CampaignTeamMember.destroy({ where: { campaignId: campaign.id }, transaction })
        await CampaignTeamMember.bulkCreate(
          [...teamSet].map((userId) => ({ campaignId: campaign.id, userId })),
          { transaction },
        )
      })
    }

    const full = await loadCampaignForCompany(campaign.id, req.user.companyId)
    return res.json({ success: true, data: full.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function addLeads(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })

    const { leadIds, preferExistingTeamAssignee = false, skipUpdatingLeadAssignedTo = false } = req.body || {}
    if (!Array.isArray(leadIds) || !leadIds.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'leadIds is required' } })
    }

    const accessWhere = await leadAccessWhere(req.user)
    const leads = await Lead.findAll({
      where: { ...accessWhere, id: { [Op.in]: leadIds }, workspaceId, companyId: req.user.companyId, isDeleted: false },
    })
    if (!leads.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No valid leads found' } })
    }

    const existingCl = await CampaignLead.findAll({
      where: { campaignId: campaign.id, leadId: { [Op.in]: leads.map((l) => l.id) } },
      attributes: ['leadId'],
    })
    const existingSet = new Set(existingCl.map((e) => String(e.leadId)))
    const newLeads = leads.filter((l) => !existingSet.has(String(l.id)))

    if (!newLeads.length) {
      return res.json({ success: true, data: { added: 0, skipped: existingSet.size }, meta: {} })
    }

    const teamMembers = await CampaignTeamMember.findAll({
      where: { campaignId: campaign.id },
      attributes: ['userId'],
    })
    const teamArr = teamMembers.map((m) => String(m.userId))
    const teamSet = new Set(teamArr)
    const existingCount = await CampaignLead.count({ where: { campaignId: campaign.id } })
    let rr = existingCount

    const rows = []
    for (const lead of newLeads) {
      let assignedUserId = null
      if (teamArr.length) {
        if (preferExistingTeamAssignee && lead.assignedTo && teamSet.has(String(lead.assignedTo))) {
          assignedUserId = lead.assignedTo
        } else {
          assignedUserId = teamArr[rr % teamArr.length]
          rr += 1
        }
      }
      rows.push({ campaignId: campaign.id, leadId: lead.id, stageKey: 'new', assignedUserId })
    }

    await sequelize.transaction(async (transaction) => {
      await CampaignLead.bulkCreate(rows, { transaction })
      if (!skipUpdatingLeadAssignedTo) {
        for (const row of rows) {
          if (row.assignedUserId) {
            await Lead.update({ assignedTo: row.assignedUserId }, { where: { id: row.leadId }, transaction })
          }
        }
      }
    })

    return res.json({ success: true, data: { added: newLeads.length, skipped: existingSet.size }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function removeLead(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })
    const deleted = await CampaignLead.destroy({ where: { campaignId: campaign.id, leadId: req.params.leadId } })
    if (!deleted) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not in campaign' } })
    return res.json({ success: true, data: {}, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function addMembers(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })

    const { userIds } = req.body || {}
    if (!Array.isArray(userIds) || !userIds.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'userIds is required' } })
    }
    const usersOk = await User.count({ where: { id: { [Op.in]: userIds }, companyId: req.user.companyId } })
    if (usersOk !== userIds.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid user selection' } })
    }

    const existing = await CampaignTeamMember.findAll({ where: { campaignId: campaign.id }, attributes: ['userId'] })
    const existingSet = new Set(existing.map((m) => String(m.userId)))
    const newUserIds = userIds.filter((uid) => !existingSet.has(String(uid)))
    if (newUserIds.length) {
      await CampaignTeamMember.bulkCreate(newUserIds.map((userId) => ({ campaignId: campaign.id, userId })))
    }

    const full = await loadCampaignForCompany(campaign.id, req.user.companyId)
    return res.json({ success: true, data: full.get({ plain: true }), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function removeMember(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })
    await CampaignTeamMember.destroy({ where: { campaignId: campaign.id, userId: req.params.userId } })
    return res.json({ success: true, data: {}, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function distributeLeads(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })

    const teamMembers = await CampaignTeamMember.findAll({ where: { campaignId: campaign.id }, attributes: ['userId'] })
    if (!teamMembers.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'No team members to distribute to' } })
    }
    const teamArr = teamMembers.map((m) => String(m.userId))
    const { skipUpdatingLeadAssignedTo = false } = req.body || {}

    const unassigned = await CampaignLead.findAll({ where: { campaignId: campaign.id, assignedUserId: null } })
    if (!unassigned.length) {
      return res.json({ success: true, data: { distributed: 0 }, meta: {} })
    }

    let rr = 0
    await sequelize.transaction(async (transaction) => {
      for (const cl of unassigned) {
        const assignedUserId = teamArr[rr % teamArr.length]
        rr += 1
        await cl.update({ assignedUserId }, { transaction })
        if (!skipUpdatingLeadAssignedTo) {
          await Lead.update({ assignedTo: assignedUserId }, { where: { id: cl.leadId }, transaction })
        }
      }
    })

    return res.json({ success: true, data: { distributed: unassigned.length }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchLeadStage(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const { error, value } = patchLeadStageSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })
    const stages = Array.isArray(campaign.stages) ? campaign.stages : DEFAULT_CAMPAIGN_STAGES
    if (!stages.some((s) => s.key === value.stageKey)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid campaign stage' } })
    }
    const [updated] = await CampaignLead.update(
      { stageKey: value.stageKey },
      { where: { campaignId: campaign.id, leadId: req.params.leadId } },
    )
    if (!updated) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not in campaign' } })
    }
    return res.json({
      success: true,
      data: { campaignId: campaign.id, leadId: req.params.leadId, stageKey: value.stageKey },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function remove(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])
    const campaign = await Campaign.findOne({
      where: { id: req.params.id, companyId: req.user.companyId, workspaceId },
    })
    if (!campaign) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } })
    }
    await sequelize.transaction(async (transaction) => {
      await CampaignLead.destroy({ where: { campaignId: campaign.id }, transaction })
      await CampaignTeamMember.destroy({ where: { campaignId: campaign.id }, transaction })
      await campaign.destroy({ transaction })
    })
    return res.json({ success: true, data: { id: campaign.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
