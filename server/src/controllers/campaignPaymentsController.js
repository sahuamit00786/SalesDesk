import Joi from 'joi'
import { Op, literal } from 'sequelize'
import { Campaign, CampaignLead, CampaignPayment, Lead, Activity, User } from '../models/index.js'

const MODES = ['bank_transfer', 'cash', 'cheque', 'upi', 'card', 'crypto', 'other']
const STATUSES = ['pending', 'received', 'failed', 'refunded']

const createSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase().default('USD'),
  paymentDate: Joi.string().isoDate().required(),
  mode: Joi.string().valid(...MODES).default('bank_transfer'),
  reference: Joi.string().trim().max(120).allow('', null),
  notes: Joi.string().trim().max(4000).allow('', null),
  status: Joi.string().valid(...STATUSES).default('received'),
})

const patchSchema = Joi.object({
  amount: Joi.number().positive(),
  currency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase(),
  paymentDate: Joi.string().isoDate(),
  mode: Joi.string().valid(...MODES),
  reference: Joi.string().trim().max(120).allow('', null),
  notes: Joi.string().trim().max(4000).allow('', null),
  status: Joi.string().valid(...STATUSES),
})

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
  const campaignLead = await CampaignLead.findOne({ where: { campaignId, leadId } })
  return { campaign, campaignLead }
}

// GET /campaigns/:id/payments — all payments for the whole campaign
export async function listForCampaign(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const campaign = await Campaign.findOne({ where: { id: req.params.id, workspaceId, companyId: req.user.companyId } })
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })

    const where = { campaignId: campaign.id }
    if (req.query.status) where.status = req.query.status
    if (req.query.mode) where.mode = req.query.mode
    if (req.query.leadId) where.leadId = req.query.leadId
    if (req.query.dateFrom || req.query.dateTo) {
      where.paymentDate = {}
      if (req.query.dateFrom) where.paymentDate[Op.gte] = req.query.dateFrom
      if (req.query.dateTo) where.paymentDate[Op.lte] = req.query.dateTo
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

// GET /campaigns/:id/leads/:leadId/payments
export async function listForLead(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })

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
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })

    const { error, value } = createSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { message: error.details.map((d) => d.message).join(', ') } })

    const currency = value.currency || campaign.currency || 'USD'

    const payment = await CampaignPayment.create({
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
    })

    await payment.reload({ include: paymentIncludes })

    const actor = await User.findByPk(req.user.id, { attributes: ['name', 'email'] })
    const actorName = actor?.name?.trim() || actor?.email || 'Someone'
    const modeLabel = value.mode.replace(/_/g, ' ')
    const amountFormatted = `${currency} ${Number(value.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    const body = `Payment of ${amountFormatted} received via ${modeLabel}${value.reference ? ` (ref: ${value.reference})` : ''} — Campaign: ${campaign.name} — recorded by ${actorName}`

    try {
      await Activity.create({
        type: 'system',
        body,
        metadata: {
          action: 'campaign_payment_recorded',
          paymentId: payment.id,
          campaignId: campaign.id,
          campaignName: campaign.name,
          amount: value.amount,
          currency,
          mode: value.mode,
          status: value.status,
          reference: value.reference || null,
          actorUserId: req.user.id,
        },
        leadId: req.params.leadId,
        userId: req.user.id,
      })
    } catch { /* non-fatal */ }

    return res.status(201).json({ success: true, data: serializePayment(payment) })
  } catch (e) { return next(e) }
}

// PATCH /campaigns/:id/leads/:leadId/payments/:paymentId
export async function patch(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })

    const payment = await CampaignPayment.findOne({
      where: { id: req.params.paymentId, campaignLeadId: campaignLead.id },
      include: paymentIncludes,
    })
    if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } })

    const { error, value } = patchSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { message: error.details.map((d) => d.message).join(', ') } })

    await payment.update(value)
    await payment.reload({ include: paymentIncludes })

    return res.json({ success: true, data: serializePayment(payment) })
  } catch (e) { return next(e) }
}

// DELETE /campaigns/:id/leads/:leadId/payments/:paymentId
export async function remove(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const { campaign, campaignLead } = await loadCampaignAndLead(req.params.id, req.params.leadId, workspaceId, req.user.companyId)
    if (!campaign) return res.status(404).json({ success: false, error: { message: 'Campaign not found' } })
    if (!campaignLead) return res.status(404).json({ success: false, error: { message: 'Lead not in campaign' } })

    const payment = await CampaignPayment.findOne({ where: { id: req.params.paymentId, campaignLeadId: campaignLead.id } })
    if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } })

    await payment.destroy()
    return res.json({ success: true, data: null })
  } catch (e) { return next(e) }
}
