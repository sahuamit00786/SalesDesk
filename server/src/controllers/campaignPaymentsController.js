import Joi from 'joi'
import { Op, literal } from 'sequelize'
import { Campaign, CampaignLead, CampaignPayment, Lead, Activity, User } from '../models/index.js'
import {
  assertWorkspaceAccess,
  assertCampaignOpen,
  isSalesOnlyUser,
  salesCanTouchCampaignLead,
} from './campaignsController.js'
import { emitLeadWorkflowTriggers } from '../services/workflowRunner.js'

const MODES = ['bank_transfer', 'cash', 'cheque', 'upi', 'card', 'crypto', 'other']
const STATUSES = ['pending', 'received', 'failed', 'refunded']
const MAX_AMOUNT = 999999999999.99 // DECIMAL(14,2)

const createSchema = Joi.object({
  amount: Joi.number().positive().precision(2).max(MAX_AMOUNT).required(),
  // No default here: an omitted currency must fall back to the campaign currency, not USD
  currency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase().optional(),
  paymentDate: Joi.string().isoDate().required(),
  mode: Joi.string().valid(...MODES).default('bank_transfer'),
  reference: Joi.string().trim().max(120).allow('', null),
  notes: Joi.string().trim().max(4000).allow('', null),
  status: Joi.string().valid(...STATUSES).default('received'),
  /** Optional client-generated dedup key (also accepted via Idempotency-Key header). */
  idempotencyKey: Joi.string().trim().max(120).allow('', null),
})

const patchSchema = Joi.object({
  amount: Joi.number().positive().precision(2).max(MAX_AMOUNT),
  currency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase(),
  paymentDate: Joi.string().isoDate(),
  mode: Joi.string().valid(...MODES),
  reference: Joi.string().trim().max(120).allow('', null),
  notes: Joi.string().trim().max(4000).allow('', null),
  status: Joi.string().valid(...STATUSES),
}).min(1)

function serializePayment(p) {
  const plain = p.get ? p.get({ plain: true }) : p
  return {
    id: plain.id,
    campaignId: plain.campaignId,
    campaignLeadId: plain.campaignLeadId,
    leadId: plain.leadId,
    amount: Number(plain.amount),
    currency: plain.currency,
    paymentDate: plain.paymentDate,
    mode: plain.mode,
    reference: plain.reference || null,
    notes: plain.notes || null,
    status: plain.status,
    idempotencyKey: plain.idempotencyKey || null,
    createdByUserId: plain.createdByUserId,
    createdBy: plain.createdBy
      ? { id: plain.createdBy.id, name: plain.createdBy.name, email: plain.createdBy.email }
      : null,
    createdAt: plain.createdAt || plain.created_at,
    updatedAt: plain.updatedAt || plain.updated_at,
  }
}

const paymentIncludes = [
  { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'], required: false },
]

async function loadCampaignAndLead(campaignId, leadId, workspaceId, companyId) {
  const campaign = await Campaign.findOne({ where: { id: campaignId, workspaceId, companyId } })
  if (!campaign) return { campaign: null, campaignLead: null }
  const campaignLead = await CampaignLead.findOne({
    where: { campaignId, leadId },
    include: [{ model: Lead, as: 'lead', attributes: ['id', 'assignedTo'], required: false }],
  })
  return { campaign, campaignLead }
}

async function logPaymentActivity(req, campaign, payment, action, extra = {}) {
  try {
    await Activity.create({
      type: 'system',
      body: extra.body || `Campaign payment ${action} — Campaign: ${campaign.name}`,
      metadata: {
        action: `campaign_payment_${action}`,
        paymentId: payment.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        amount: Number(payment.amount),
        currency: payment.currency,
        mode: payment.mode,
        status: payment.status,
        reference: payment.reference || null,
        actorUserId: req.user.id,
        ...extra.metadata,
      },
      leadId: payment.leadId,
      userId: req.user.id,
    })
  } catch { /* non-fatal */ }
}

// GET /campaigns/:id/payments — all payments for the whole campaign
export async function listForCampaign(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])

    const campaign = await Campaign.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })

    const where = { campaignId: campaign.id }
    if (req.query.status && STATUSES.includes(String(req.query.status))) where.status = req.query.status
    if (req.query.mode && MODES.includes(String(req.query.mode))) where.mode = req.query.mode
    if (req.query.leadId) where.leadId = req.query.leadId
    if (req.query.dateFrom || req.query.dateTo) {
      where.paymentDate = {}
      if (req.query.dateFrom) where.paymentDate[Op.gte] = req.query.dateFrom
      if (req.query.dateTo) where.paymentDate[Op.lte] = req.query.dateTo
    }

    if (isSalesOnlyUser(req.user)) {
      // Sales sees only payments for campaign leads assigned to them
      const ownClIds = await CampaignLead.findAll({
        attributes: ['id'],
        where: {
          campaignId: campaign.id,
          [Op.or]: [{ assignedUserId: req.user.id }, { '$lead.assigned_to$': req.user.id }],
        },
        include: [{ model: Lead, as: 'lead', attributes: [], required: true }],
        raw: true,
      }).then((rows) => rows.map((r) => r.id))
      where.campaignLeadId = ownClIds.length ? ownClIds : [null]
    }

    const rows = await CampaignPayment.findAll({
      where,
      include: [
        ...paymentIncludes,
        { model: Lead, as: 'lead', attributes: ['id', 'contactName', 'title', 'email'], required: false },
      ],
      order: [[literal('payment_date'), 'DESC'], [literal('created_at'), 'DESC']],
    })

    const serialized = rows.map((p) => {
      const base = serializePayment(p)
      const plain = p.get({ plain: true })
      base.lead = plain.lead || null
      return base
    })

    return res.json({ success: true, data: serialized })
  } catch (e) { return next(e) }
}

function csvCell(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// GET /campaigns/:id/payments/export — CSV, same scoping/filters as listForCampaign
export async function exportPaymentsCsv(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])

    const campaign = await Campaign.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })

    const where = { campaignId: campaign.id }
    if (req.query.status && STATUSES.includes(String(req.query.status))) where.status = req.query.status
    if (req.query.mode && MODES.includes(String(req.query.mode))) where.mode = req.query.mode
    if (req.query.dateFrom || req.query.dateTo) {
      where.paymentDate = {}
      if (req.query.dateFrom) where.paymentDate[Op.gte] = req.query.dateFrom
      if (req.query.dateTo) where.paymentDate[Op.lte] = req.query.dateTo
    }
    if (isSalesOnlyUser(req.user)) {
      const ownClIds = await CampaignLead.findAll({
        attributes: ['id'],
        where: {
          campaignId: campaign.id,
          [Op.or]: [{ assignedUserId: req.user.id }, { '$lead.assigned_to$': req.user.id }],
        },
        include: [{ model: Lead, as: 'lead', attributes: [], required: true }],
        raw: true,
      }).then((rows) => rows.map((r) => r.id))
      where.campaignLeadId = ownClIds.length ? ownClIds : [null]
    }

    const rows = await CampaignPayment.findAll({
      where,
      include: [
        ...paymentIncludes,
        { model: Lead, as: 'lead', attributes: ['id', 'contactName', 'title', 'email'], required: false },
      ],
      order: [[literal('payment_date'), 'DESC'], [literal('created_at'), 'DESC']],
      limit: 5000,
    })

    const lines = ['Lead Name,Amount,Currency,Payment Date,Mode,Status,Reference,Recorded By,Created At']
    for (const p of rows) {
      const plain = p.get({ plain: true })
      const lead = plain.lead
      lines.push(
        [
          csvCell(lead ? (lead.contactName || lead.title || 'Lead') : 'Deleted lead'),
          csvCell(Number(plain.amount)),
          csvCell(plain.currency),
          csvCell(plain.paymentDate),
          csvCell(plain.mode),
          csvCell(plain.status),
          csvCell(plain.reference || ''),
          csvCell(plain.createdBy ? (plain.createdBy.name || plain.createdBy.email) : ''),
          csvCell(plain.createdAt),
        ].join(','),
      )
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${campaign.id}-payments.csv"`)
    return res.send(lines.join('\n'))
  } catch (e) { return next(e) }
}

// GET /campaigns/:id/leads/:leadId/payments
export async function listForLead(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })
    if (!salesCanTouchCampaignLead(req.user, campaignLead)) {
      return res.status(403).json({ success: false, error: { message: 'You can only view payments for leads assigned to you' } })
    }

    const rows = await CampaignPayment.findAll({
      where: { campaignId: campaign.id, campaignLeadId: campaignLead.id },
      include: paymentIncludes,
      order: [[literal('payment_date'), 'DESC'], [literal('created_at'), 'DESC']],
    })

    return res.json({ success: true, data: rows.map(serializePayment) })
  } catch (e) { return next(e) }
}

// POST /campaigns/:id/leads/:leadId/payments
export async function create(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })
    if (!salesCanTouchCampaignLead(req.user, campaignLead)) {
      return res.status(403).json({ success: false, error: { message: 'You can only record payments for leads assigned to you' } })
    }
    assertCampaignOpen(campaign)

    const { error, value } = createSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { message: error.details.map((d) => d.message).join(', ') } })

    const idempotencyKey = String(req.headers['idempotency-key'] || value.idempotencyKey || '').trim() || null

    if (idempotencyKey) {
      // Replay of a request we've already processed (double-click, client retry) returns the original payment.
      const existing = await CampaignPayment.findOne({
        where: { campaignId: campaign.id, idempotencyKey },
        include: paymentIncludes,
      })
      if (existing) {
        return res.status(200).json({ success: true, data: serializePayment(existing), replayed: true })
      }
    }

    const currency = value.currency || campaign.currency || 'USD'

    let payment
    try {
      payment = await CampaignPayment.create({
        campaignId: campaign.id,
        campaignLeadId: campaignLead.id,
        leadId: req.params.leadId,
        workspaceId: String(workspaceId),
        companyId: req.user.companyId,
        amount: value.amount,
        currency,
        paymentDate: value.paymentDate,
        mode: value.mode,
        reference: value.reference || null,
        notes: value.notes || null,
        status: value.status,
        createdByUserId: req.user.id,
        idempotencyKey,
      })
    } catch (createErr) {
      // Concurrent duplicate request raced us to the unique index — fetch what won and return it.
      if (idempotencyKey && createErr?.name === 'SequelizeUniqueConstraintError') {
        const winner = await CampaignPayment.findOne({
          where: { campaignId: campaign.id, idempotencyKey },
          include: paymentIncludes,
        })
        if (winner) return res.status(200).json({ success: true, data: serializePayment(winner), replayed: true })
      }
      throw createErr
    }

    await payment.reload({ include: paymentIncludes })

    const actor = await User.findByPk(req.user.id, { attributes: ['name', 'email'] })
    const actorName = actor?.name?.trim() || actor?.email || 'Someone'
    const modeLabel = value.mode.replace(/_/g, ' ')
    const amountFormatted = `${currency} ${Number(value.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    const body = `Payment of ${amountFormatted} received via ${modeLabel}${value.reference ? ` (ref: ${value.reference})` : ''} — Campaign: ${campaign.name} — recorded by ${actorName}`

    await logPaymentActivity(req, campaign, payment, 'recorded', { body })

    if (value.status === 'received') {
      const leadRow = await Lead.findByPk(req.params.leadId)
      if (leadRow) {
        emitLeadWorkflowTriggers({
          eventType: 'campaign_payment_received',
          lead: leadRow,
          before: null,
          companyId: campaign.companyId,
          workspaceId: campaign.workspaceId,
          actorUserId: req.user.id,
        }).catch(() => {})
      }
    }

    return res.status(201).json({ success: true, data: serializePayment(payment) })
  } catch (e) { return next(e) }
}

// PATCH /campaigns/:id/leads/:leadId/payments/:paymentId
export async function patch(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })
    if (!salesCanTouchCampaignLead(req.user, campaignLead)) {
      return res.status(403).json({ success: false, error: { message: 'You can only edit payments for leads assigned to you' } })
    }

    const payment = await CampaignPayment.findOne({
      where: { id: req.params.paymentId, campaignLeadId: campaignLead.id },
      include: paymentIncludes,
    })
    if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } })

    const { error, value } = patchSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { message: error.details.map((d) => d.message).join(', ') } })

    const before = serializePayment(payment)
    await payment.update(value)
    await payment.reload({ include: paymentIncludes })

    await logPaymentActivity(req, campaign, payment, 'updated', {
      metadata: {
        changes: Object.keys(value),
        before: { amount: before.amount, currency: before.currency, status: before.status, mode: before.mode, paymentDate: before.paymentDate },
      },
    })

    return res.json({ success: true, data: serializePayment(payment) })
  } catch (e) { return next(e) }
}

// DELETE /campaigns/:id/leads/:leadId/payments/:paymentId
export async function remove(req, res, next) {
  try {
    const workspaceId = await assertWorkspaceAccess(req, req.headers['x-workspace-id'])

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })
    if (!salesCanTouchCampaignLead(req.user, campaignLead)) {
      return res.status(403).json({ success: false, error: { message: 'You can only delete payments for leads assigned to you' } })
    }

    const payment = await CampaignPayment.findOne({ where: { id: req.params.paymentId, campaignLeadId: campaignLead.id } })
    if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } })

    await logPaymentActivity(req, campaign, payment, 'deleted', {
      body: `Payment of ${payment.currency} ${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} deleted — Campaign: ${campaign.name}`,
    })
    await payment.destroy()
    return res.json({ success: true, data: null })
  } catch (e) { return next(e) }
}
