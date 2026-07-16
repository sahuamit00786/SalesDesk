import Joi from 'joi'
import { Op } from 'sequelize'
import { Deal, DealActivity, DealPayment, Activity, User, InvoicePayment, Invoice } from '../models/index.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { notifyInvoicePayment } from '../services/notification/teamNotificationService.js'

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
    dealId: plain.dealId,
    amount: Number(plain.amount),
    currency: plain.currency,
    paymentDate: plain.paymentDate,
    mode: plain.mode,
    reference: plain.reference || null,
    notes: plain.notes || null,
    status: plain.status,
    invoicePaymentId: plain.invoicePaymentId || null,
    invoiceId: plain.invoicePayment?.invoice?.id || null,
    invoiceNumber: plain.invoicePayment?.invoice?.invoiceNumber || null,
    createdByUserId: plain.createdByUserId,
    createdBy: plain.createdBy
      ? { id: plain.createdBy.id, name: plain.createdBy.name, email: plain.createdBy.email }
      : null,
    createdAt: plain.createdAt || plain.created_at,
    updatedAt: plain.updatedAt || plain.updated_at,
  }
}

async function getDeal(id, workspaceId, user) {
  // Payment access only needs workspace membership — not deal ownership.
  // leadAccessWhere (used for lead visibility) is intentionally NOT used here.
  return Deal.findOne({
    where: { id, workspaceId: String(workspaceId), companyId: user.companyId, isDeleted: false },
  })
}

const paymentIncludes = [
  { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'], required: false },
  {
    model: InvoicePayment,
    as: 'invoicePayment',
    attributes: ['id'],
    required: false,
    include: [{ model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber'], required: false }],
  },
]

// GET /deals/:id/payments
export async function listForDeal(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const deal = await getDeal(req.params.id, workspaceId, req.user)
    if (!deal) return res.status(404).json({ success: false, error: { message: 'Deal not found' } })

    const where = { dealId: deal.id }
    if (req.query.status) where.status = req.query.status
    if (req.query.mode) where.mode = req.query.mode
    if (req.query.dateFrom || req.query.dateTo) {
      where.paymentDate = {}
      if (req.query.dateFrom) where.paymentDate[Op.gte] = req.query.dateFrom
      if (req.query.dateTo) where.paymentDate[Op.lte] = req.query.dateTo
    }

    const rows = await DealPayment.findAll({
      where,
      include: paymentIncludes,
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']],
    })

    return res.json({ success: true, data: rows.map(serializePayment) })
  } catch (e) { return next(e) }
}

// GET /deals/payments  — workspace-wide list with filters
export async function listAll(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25))
    const offset = (page - 1) * limit

    const where = { workspaceId: String(workspaceId), companyId: req.user.companyId }
    if (req.query.status) where.status = req.query.status
    if (req.query.mode) where.mode = req.query.mode
    if (req.query.dealId) where.dealId = req.query.dealId
    if (req.query.createdByUserId) where.createdByUserId = req.query.createdByUserId
    if (req.query.dateFrom || req.query.dateTo) {
      where.paymentDate = {}
      if (req.query.dateFrom) where.paymentDate[Op.gte] = req.query.dateFrom
      if (req.query.dateTo) where.paymentDate[Op.lte] = req.query.dateTo
    }

    const { rows, count } = await DealPayment.findAndCountAll({
      where,
      include: [
        ...paymentIncludes,
        {
          model: Deal,
          as: 'deal',
          attributes: ['id', 'name', 'stage', 'value', 'value_currency'],
          required: false,
        },
      ],
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
      col: 'id',
    })

    const serialized = rows.map((p) => {
      const base = serializePayment(p)
      const plain = p.get({ plain: true })
      base.deal = plain.deal
        ? { id: plain.deal.id, name: plain.deal.name, stage: plain.deal.stage }
        : null
      return base
    })

    return res.json({ success: true, data: serialized, meta: { total: count, page, limit } })
  } catch (e) { return next(e) }
}

// POST /deals/:id/payments
export async function create(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const deal = await getDeal(req.params.id, workspaceId, req.user)
    if (!deal) return res.status(404).json({ success: false, error: { message: 'Deal not found' } })

    const { error, value } = createSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { message: error.details.map((d) => d.message).join(', ') } })

    const payment = await DealPayment.create({
      dealId: deal.id,
      workspaceId: String(workspaceId),
      companyId: req.user.companyId,
      amount: value.amount,
      currency: value.currency,
      paymentDate: value.paymentDate,
      mode: value.mode,
      reference: value.reference || null,
      notes: value.notes || null,
      status: value.status,
      createdByUserId: req.user.id,
    })

    await payment.reload({ include: paymentIncludes })

    const actor = (await User.findByPk(req.user.id, { attributes: ['name', 'email'] }))
    const actorName = actor?.name?.trim() || actor?.email || 'Someone'
    const modeLabel = value.mode.replace(/_/g, ' ')
    const body = `Payment of ${value.currency} ${Number(value.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} received via ${modeLabel}${value.reference ? ` (ref: ${value.reference})` : ''} — recorded by ${actorName}`

    // Log deal activity
    await DealActivity.create({
      type: 'payment',
      body,
      metadata: {
        action: 'payment_recorded',
        paymentId: payment.id,
        amount: value.amount,
        currency: value.currency,
        mode: value.mode,
        status: value.status,
        reference: value.reference || null,
        actorUserId: req.user.id,
      },
      dealId: deal.id,
      userId: req.user.id,
    })

    // Also log on parent opportunity lead for lead/opportunity activity feed
    if (deal.opportunityLeadId) {
      try {
        await Activity.create({
          type: 'system',
          body,
          metadata: {
            action: 'deal_payment_recorded',
            paymentId: payment.id,
            dealId: deal.id,
            dealName: deal.name,
            amount: value.amount,
            currency: value.currency,
            mode: value.mode,
            status: value.status,
            actorUserId: req.user.id,
          },
          leadId: deal.opportunityLeadId,
          userId: req.user.id,
        })
      } catch { /* non-fatal */ }
    }

    const paymentRecipients = new Set()
    if (deal.assignedTo) paymentRecipients.add(String(deal.assignedTo))
    if (deal.ownerUserId) paymentRecipients.add(String(deal.ownerUserId))
    paymentRecipients.delete(String(req.user.id))
    for (const uid of paymentRecipients) {
      notifyInvoicePayment({
        companyId: req.user.companyId,
        workspaceId: String(workspaceId),
        recipientUserId: uid,
        actorUserId: req.user.id,
        dealId: deal.id,
        dealName: deal.name,
        amount: value.amount,
        currency: value.currency,
        kind: 'payment',
      }).catch(() => {})
    }

    return res.status(201).json({ success: true, data: serializePayment(payment) })
  } catch (e) { return next(e) }
}

// PATCH /deals/:id/payments/:paymentId
export async function patch(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const deal = await getDeal(req.params.id, workspaceId, req.user)
    if (!deal) return res.status(404).json({ success: false, error: { message: 'Deal not found' } })

    const payment = await DealPayment.findOne({
      where: { id: req.params.paymentId, dealId: deal.id },
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

// DELETE /deals/:id/payments/:paymentId
export async function remove(req, res, next) {
  try {
    const workspaceId = req.headers['x-workspace-id']
    if (!workspaceId) return res.status(400).json({ success: false, error: { message: 'workspaceId required' } })

    const deal = await getDeal(req.params.id, workspaceId, req.user)
    if (!deal) return res.status(404).json({ success: false, error: { message: 'Deal not found' } })

    const payment = await DealPayment.findOne({ where: { id: req.params.paymentId, dealId: deal.id } })
    if (!payment) return res.status(404).json({ success: false, error: { message: 'Payment not found' } })

    await payment.destroy()
    return res.json({ success: true, data: null })
  } catch (e) { return next(e) }
}
