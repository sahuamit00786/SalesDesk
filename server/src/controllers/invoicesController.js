import Joi from 'joi'
import { Op, Transaction } from 'sequelize'
import {
  sequelize,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  SalesDocTemplate,
  WorkspaceBillingProfile,
  Lead,
  Deal,
  DealPayment,
  Quotation,
} from '../models/index.js'
import { requireWorkspaceFromRequest } from '../services/workspaceScope.js'
import { aggregateInvoiceTotals } from '../services/salesTotals.js'
import { allocateInvoiceNumber } from '../services/docNumberFormat.js'
import { buildCustomerSnapshotFromLead, mergeBillingIntoPaymentSnapshot } from '../services/salesCustomerSnapshot.js'
import { recordInvoiceCreatedOnLead } from '../services/leadSalesDocActivity.js'
import { resolveLeadAndDealForSalesDoc } from '../services/salesDocLeadDealResolve.js'
import { enrichSalesDocListRow } from '../services/salesDocListSerialize.js'

const listIncludes = [
  { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'company', 'email'], required: false },
  { model: Deal, as: 'deal', attributes: ['id', 'name', 'stage'], required: false },
]

/** True unless template explicitly sets sectionSettings.showBankDetails === false */
function invoiceTemplateShowsBank(template) {
  if (!template) return true
  const s = template.sectionSettings
  if (!s || typeof s !== 'object') return true
  return s.showBankDetails !== false
}

const documentThemeSchema = Joi.object({
  accentColor: Joi.string().trim().max(32).allow('', null),
  headerTone: Joi.string().valid('light', 'dark').allow(null),
}).allow(null)

const lineSchema = Joi.object({
  name: Joi.string().trim().max(255).required(),
  sku: Joi.string().trim().max(120).allow('', null),
  description: Joi.string().trim().allow('', null),
  hsnSac: Joi.string().trim().max(32).allow('', null),
  quantity: Joi.number().positive().default(1),
  unitPrice: Joi.number().min(0).default(0),
  discountPct: Joi.number().min(0).max(100).allow(null),
  discountAmount: Joi.number().min(0).allow(null),
  taxPct: Joi.number().min(0).max(100).allow(null),
  taxType: Joi.string().trim().max(16).allow('', null),
  servicePeriodStart: Joi.string().isoDate().allow(null),
  servicePeriodEnd: Joi.string().isoDate().allow(null),
})

const createSchema = Joi.object({
  leadId: Joi.string().uuid().optional(),
  dealId: Joi.string().uuid().optional(),
  invoiceTemplateId: Joi.string().uuid().allow(null),
  quotationId: Joi.string().uuid().allow(null),
  ownerUserId: Joi.string().uuid().allow(null),
  issueDate: Joi.string().isoDate().required(),
  dueDate: Joi.string().isoDate().allow(null),
  reference: Joi.string().trim().max(120).allow('', null),
  purchaseOrderRef: Joi.string().trim().max(120).allow('', null),
  customerSnapshot: Joi.object().unknown(true).allow(null),
  items: Joi.array().items(lineSchema).min(1).required(),
  currency: Joi.string().length(3).default('USD'),
  shipping: Joi.number().default(0),
  adjustment: Joi.number().default(0),
  roundOff: Joi.number().default(0),
  notes: Joi.string().trim().allow('', null),
  termsSnapshot: Joi.string().trim().allow('', null),
  status: Joi.string()
    .valid('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded')
    .default('draft'),
  layoutPreset: Joi.number().integer().min(1).max(8).allow(null),
  documentTheme: documentThemeSchema,
})
  .or('leadId', 'dealId')
  .messages({
    'object.missing': 'Either leadId or dealId is required',
  })

const patchSchema = Joi.object({
  dealId: Joi.string().uuid().allow(null),
  invoiceTemplateId: Joi.string().uuid().allow(null),
  ownerUserId: Joi.string().uuid().allow(null),
  issueDate: Joi.string().isoDate(),
  dueDate: Joi.string().isoDate().allow(null),
  reference: Joi.string().trim().max(120).allow('', null),
  purchaseOrderRef: Joi.string().trim().max(120).allow('', null),
  customerSnapshot: Joi.object().unknown(true).allow(null),
  items: Joi.array().items(lineSchema).min(1),
  currency: Joi.string().length(3),
  shipping: Joi.number(),
  adjustment: Joi.number(),
  roundOff: Joi.number(),
  notes: Joi.string().trim().allow('', null),
  termsSnapshot: Joi.string().trim().allow('', null),
  status: Joi.string().valid('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'),
  layoutPreset: Joi.number().integer().min(1).max(8).allow(null),
  documentTheme: documentThemeSchema,
})
  .unknown(false)
  .min(1)

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paidAt: Joi.date().iso().required(),
  mode: Joi.string().trim().max(32).allow('', null),
  reference: Joi.string().trim().max(120).allow('', null),
})

function serializeInvoice(inv, items = [], payments = []) {
  const plain = typeof inv.toJSON === 'function' ? inv.toJSON() : inv
  return {
    ...plain,
    items: items.map((it) => (typeof it.toJSON === 'function' ? it.toJSON() : it)),
    payments: payments.map((p) => (typeof p.toJSON === 'function' ? p.toJSON() : p)),
  }
}

// Statuses that may accept payments. Draft must be issued first; cancelled/refunded are terminal.
const PAYABLE_STATUSES = ['issued', 'partially_paid', 'overdue']
// Statuses derived purely from recorded payments — never settable by hand.
const PAYMENT_DERIVED_STATUSES = ['paid', 'partially_paid']
const MONEY_EPSILON = 0.009

function deriveInvoiceStatus(amountPaid, grandTotal, priorStatus) {
  const paid = Number(amountPaid) || 0
  const total = Number(grandTotal) || 0
  if (priorStatus === 'cancelled' || priorStatus === 'refunded') return priorStatus
  if (paid >= total && total > 0) return 'paid'
  if (paid > 0 && paid < total) return 'partially_paid'
  // No payments: paid/partially_paid fall back to issued (e.g. after removing payments)
  if (PAYMENT_DERIVED_STATUSES.includes(priorStatus)) return 'issued'
  if (priorStatus === 'draft') return 'draft'
  return priorStatus || 'issued'
}

export async function listInvoices(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const leadId = req.query.leadId || null
    const dealId = req.query.dealId || null
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
    const offset = (page - 1) * limit

    const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded']
    const status = INVOICE_STATUSES.includes(req.query.status) ? req.query.status : null
    const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateFrom || '')) ? req.query.dateFrom : null
    const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateTo || '')) ? req.query.dateTo : null
    const createdBy = req.query.createdBy || null
    const minAmount = req.query.minAmount !== undefined && req.query.minAmount !== '' ? Number(req.query.minAmount) : null
    const maxAmount = req.query.maxAmount !== undefined && req.query.maxAmount !== '' ? Number(req.query.maxAmount) : null

    const where = { workspaceId, companyId: req.user.companyId }
    if (leadId) where.leadId = leadId
    if (dealId) where.dealId = dealId
    if (status) where.status = status
    if (createdBy) where.ownerUserId = createdBy
    if (dateFrom || dateTo) {
      where.issueDate = {}
      if (dateFrom) where.issueDate[Op.gte] = dateFrom
      if (dateTo) where.issueDate[Op.lte] = dateTo
    }
    if (minAmount != null && !Number.isNaN(minAmount)) {
      where.grandTotal = { ...(where.grandTotal || {}), [Op.gte]: minAmount }
    }
    if (maxAmount != null && !Number.isNaN(maxAmount)) {
      where.grandTotal = { ...(where.grandTotal || {}), [Op.lte]: maxAmount }
    }

    const { rows, count } = await Invoice.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: listIncludes,
    })

    const summaryRows = await Invoice.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('Invoice.id')), 'cnt'],
        [sequelize.fn('SUM', sequelize.col('grand_total')), 'total'],
        [sequelize.fn('SUM', sequelize.col('amount_paid')), 'paid'],
      ],
      group: ['status'],
      raw: true,
    })
    const byStatus = {}
    let totalValue = 0
    let totalPaid = 0
    for (const r of summaryRows) {
      const cnt = Number(r.cnt) || 0
      const total = Number(r.total) || 0
      const paid = Number(r.paid) || 0
      byStatus[r.status] = { count: cnt, total, paid }
      totalValue += total
      totalPaid += paid
    }

    return res.json({
      success: true,
      data: {
        items: rows.map((r) => enrichSalesDocListRow(serializeInvoice(r), r)),
        total: count,
        page,
        limit,
      },
      meta: {
        summary: {
          byStatus,
          totalValue,
          totalPaid,
          totalOutstanding: Math.max(0, totalValue - totalPaid),
          totalCount: count,
        },
      },
    })
  } catch (e) {
    return next(e)
  }
}

export async function getInvoice(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await Invoice.findOne({
      where: {
        id: req.params.id,
        workspaceId,
        companyId: req.user.companyId,
      },
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: InvoicePayment, as: 'payments' },
      ],
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    return res.json({
      success: true,
      data: serializeInvoice(row, row.items, row.payments),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function createInvoice(req, res, next) {
  try {
    const { workspace, workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }

    const { lead, resolvedLeadId, resolvedDealId, dealRow } = await resolveLeadAndDealForSalesDoc({
      leadId: value.leadId,
      dealId: value.dealId,
      companyId: req.user.companyId,
      workspaceId,
      user: req.user,
    })

    let template = null
    if (value.invoiceTemplateId) {
      template = await SalesDocTemplate.findOne({
        where: {
          id: value.invoiceTemplateId,
          workspaceId,
          companyId: req.user.companyId,
          docType: 'invoice',
        },
      })
      if (!template) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid template' } })
      }
    }

    const totals = aggregateInvoiceTotals(value.items, { roundOff: value.roundOff, shipping: value.shipping, adjustment: value.adjustment })

    const billingRow = await WorkspaceBillingProfile.findOne({ where: { workspaceId } })
    const paymentSnapshot = mergeBillingIntoPaymentSnapshot(billingRow)

    let customerSnapshot = value.customerSnapshot || buildCustomerSnapshotFromLead(lead)
    if (dealRow?.name) {
      customerSnapshot = { ...customerSnapshot, dealName: String(dealRow.name).trim() }
    }
    const layoutPreset =
      value.layoutPreset != null
        ? value.layoutPreset
        : template?.layoutPreset != null
          ? template.layoutPreset
          : 1

    const issueDate = value.issueDate.slice(0, 10)
    const dueDate = value.dueDate ? value.dueDate.slice(0, 10) : null

    const created = await sequelize.transaction(async (transaction) => {
      let billing = await WorkspaceBillingProfile.findOne({
        where: { workspaceId },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      })
      if (!billing) {
        billing = await WorkspaceBillingProfile.create(
          {
            workspaceId,
            companyId: workspace.companyId,
            quotationPrefix: 'QT',
            quotationNextSeq: 1001,
            invoicePrefix: 'INV',
            invoiceNextSeq: 1001,
          },
          { transaction },
        )
      }

      const invoiceNumber = await allocateInvoiceNumber({ billing, template, issueDate, transaction })

      let status = value.status
      if (status === 'draft') status = 'draft'
      else if (!status || status === 'issued') status = 'issued'

      const inv = await Invoice.create(
        {
          workspaceId,
          companyId: req.user.companyId,
          invoiceTemplateId: template?.id || value.invoiceTemplateId || null,
          quotationId: value.quotationId || null,
          leadId: resolvedLeadId,
          dealId: resolvedDealId,
          ownerUserId: value.ownerUserId || req.user.id,
          invoiceNumber,
          issueDate,
          dueDate,
          reference: value.reference || null,
          purchaseOrderRef: value.purchaseOrderRef || null,
          customerSnapshot,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shipping: totals.shipping,
          adjustment: totals.adjustment,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          taxFinancial: totals.taxBreakdown,
          currency: value.currency,
          status,
          paymentBlockSnapshot: paymentSnapshot,
          termsSnapshot:
            value.termsSnapshot != null ? value.termsSnapshot : template?.defaultPaymentTerms || null,
          notes: value.notes || null,
          layoutPreset,
          documentTheme: value.documentTheme ?? null,
          showBankDetails: invoiceTemplateShowsBank(template),
          amountPaid: 0,
        },
        { transaction },
      )

      await InvoiceItem.bulkCreate(
        totals.items.map((it, idx) => ({
          invoiceId: inv.id,
          sortOrder: it.sortOrder ?? idx,
          name: it.name,
          sku: it.sku || null,
          description: it.description || null,
          hsnSac: it.hsnSac || null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          discountAmount: it.discountAmount,
          taxPct: it.taxPct,
          taxType: it.taxType || null,
          lineTotal: it.lineTotal,
          servicePeriodStart: it.servicePeriodStart ? String(it.servicePeriodStart).slice(0, 10) : null,
          servicePeriodEnd: it.servicePeriodEnd ? String(it.servicePeriodEnd).slice(0, 10) : null,
        })),
        { transaction },
      )

      return Invoice.findByPk(inv.id, {
        transaction,
        include: [
          { model: InvoiceItem, as: 'items' },
          { model: InvoicePayment, as: 'payments' },
        ],
      })
    })

    await recordInvoiceCreatedOnLead({
      leadId: resolvedLeadId,
      userId: req.user.id,
      invoice: created,
      dealId: resolvedDealId || null,
    })

    return res.status(201).json({
      success: true,
      data: serializeInvoice(created, created.items, created.payments),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function patchInvoice(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = patchSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }

    const row = await Invoice.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })

    if (value.status && PAYMENT_DERIVED_STATUSES.includes(value.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Paid and partially paid statuses are derived from recorded payments and cannot be set manually',
        },
      })
    }

    let totals = null
    if (value.items) {
      totals = aggregateInvoiceTotals(value.items, {
        roundOff: value.roundOff ?? Number(row.roundOff),
        shipping: value.shipping ?? Number(row.shipping),
        adjustment: value.adjustment ?? Number(row.adjustment),
      })
    }

    const alreadyPaid = Number(row.amountPaid) || 0
    if (totals && alreadyPaid > 0 && totals.grandTotal + MONEY_EPSILON < alreadyPaid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `New total (${totals.grandTotal.toFixed(2)}) is below the amount already paid (${alreadyPaid.toFixed(2)}). Remove payments first.`,
        },
      })
    }

    let resolvedDeal = null
    if (value.dealId) {
      resolvedDeal = await resolveLeadAndDealForSalesDoc({
        dealId: value.dealId,
        companyId: req.user.companyId,
        workspaceId,
        user: req.user,
      })
    }

    await sequelize.transaction(async (transaction) => {
      const updates = {}
      if (resolvedDeal) {
        updates.dealId = resolvedDeal.resolvedDealId
        updates.leadId = resolvedDeal.resolvedLeadId
        let snap = buildCustomerSnapshotFromLead(resolvedDeal.lead)
        if (resolvedDeal.dealRow?.name) snap = { ...snap, dealName: String(resolvedDeal.dealRow.name).trim() }
        updates.customerSnapshot = snap
      }
      if (value.issueDate) updates.issueDate = value.issueDate.slice(0, 10)
      if (value.dueDate !== undefined) updates.dueDate = value.dueDate ? value.dueDate.slice(0, 10) : null
      if (value.reference !== undefined) updates.reference = value.reference || null
      if (value.purchaseOrderRef !== undefined) updates.purchaseOrderRef = value.purchaseOrderRef || null
      if (value.customerSnapshot) updates.customerSnapshot = value.customerSnapshot
      if (value.currency) updates.currency = value.currency
      if (value.notes !== undefined) updates.notes = value.notes || null
      if (value.termsSnapshot !== undefined) updates.termsSnapshot = value.termsSnapshot || null
      if (value.ownerUserId !== undefined) updates.ownerUserId = value.ownerUserId || null
      if (value.layoutPreset != null) updates.layoutPreset = value.layoutPreset
      if (value.invoiceTemplateId !== undefined) {
        updates.invoiceTemplateId = value.invoiceTemplateId || null
        let tpl = null
        if (updates.invoiceTemplateId) {
          tpl = await SalesDocTemplate.findOne({
            where: {
              id: updates.invoiceTemplateId,
              workspaceId,
              companyId: req.user.companyId,
              docType: 'invoice',
            },
            transaction,
          })
        }
        updates.showBankDetails = invoiceTemplateShowsBank(tpl)
      }
      if (value.documentTheme !== undefined) updates.documentTheme = value.documentTheme || null

      if (totals) {
        updates.subtotal = totals.subtotal
        updates.discountTotal = totals.discountTotal
        updates.shipping = totals.shipping
        updates.adjustment = totals.adjustment
        updates.roundOff = totals.roundOff
        updates.grandTotal = totals.grandTotal
        updates.taxFinancial = totals.taxBreakdown
      }

      if (value.status) {
        updates.status = value.status
      }

      await row.update(updates, { transaction })

      if (totals) {
        await InvoiceItem.destroy({ where: { invoiceId: row.id }, transaction })
        await InvoiceItem.bulkCreate(
          totals.items.map((it, idx) => ({
            invoiceId: row.id,
            sortOrder: it.sortOrder ?? idx,
            name: it.name,
            sku: it.sku || null,
            description: it.description || null,
            hsnSac: it.hsnSac || null,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountPct: it.discountPct,
            discountAmount: it.discountAmount,
            taxPct: it.taxPct,
            taxType: it.taxType || null,
            lineTotal: it.lineTotal,
            servicePeriodStart: it.servicePeriodStart ? String(it.servicePeriodStart).slice(0, 10) : null,
            servicePeriodEnd: it.servicePeriodEnd ? String(it.servicePeriodEnd).slice(0, 10) : null,
          })),
          { transaction },
        )
      }
    })

    const fresh = await Invoice.findByPk(row.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: InvoicePayment, as: 'payments' },
      ],
    })

    const nextStatus = deriveInvoiceStatus(fresh.amountPaid, fresh.grandTotal, fresh.status)
    if (nextStatus !== fresh.status) {
      await fresh.update({ status: nextStatus })
    }

    return res.json({
      success: true,
      data: serializeInvoice(fresh, fresh.items, fresh.payments),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function recordInvoicePayment(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = paymentSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }

    const DEAL_PAYMENT_MODES = ['bank_transfer', 'cash', 'cheque', 'upi', 'card', 'crypto', 'other']

    let failure = null
    await sequelize.transaction(async (t) => {
      // Lock the invoice row so concurrent payments serialize and cannot overshoot the balance
      const invoice = await Invoice.findOne({
        where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
        transaction: t,
        lock: Transaction.LOCK.UPDATE,
      })
      if (!invoice) {
        failure = { status: 404, code: 'NOT_FOUND', message: 'Not found' }
        return
      }
      if (!PAYABLE_STATUSES.includes(invoice.status)) {
        failure = {
          status: 400,
          code: 'INVALID_STATE',
          message:
            invoice.status === 'draft'
              ? 'Draft invoices cannot accept payments. Save the invoice as issued first.'
              : `Payments cannot be recorded on a ${invoice.status} invoice`,
        }
        return
      }

      const existing = await InvoicePayment.findAll({ where: { invoiceId: invoice.id }, transaction: t })
      const alreadyPaid = existing.reduce((s, p) => s + Number(p.amount), 0)
      const balanceDue = Number(invoice.grandTotal) - alreadyPaid
      if (value.amount > balanceDue + MONEY_EPSILON) {
        failure = {
          status: 400,
          code: 'OVERPAYMENT',
          message: `Payment exceeds balance due (${balanceDue.toFixed(2)} ${invoice.currency || ''})`.trim(),
        }
        return
      }

      const payment = await InvoicePayment.create({
        invoiceId: invoice.id,
        amount: value.amount,
        paidAt: value.paidAt,
        mode: value.mode || null,
        reference: value.reference || null,
        recordedByUserId: req.user.id,
      }, { transaction: t })

      // Mirror the payment onto the linked deal so deal revenue stays in sync
      if (invoice.dealId) {
        const deal = await Deal.findOne({
          where: { id: invoice.dealId, workspaceId, companyId: req.user.companyId, isDeleted: false },
          transaction: t,
        })
        if (deal) {
          await DealPayment.create({
            dealId: deal.id,
            workspaceId,
            companyId: req.user.companyId,
            amount: value.amount,
            currency: invoice.currency || 'USD',
            paymentDate: new Date(value.paidAt).toISOString().slice(0, 10),
            mode: DEAL_PAYMENT_MODES.includes(value.mode) ? value.mode : 'other',
            reference: value.reference || null,
            notes: `Synced from invoice ${invoice.invoiceNumber}`,
            status: 'received',
            createdByUserId: req.user.id,
            invoicePaymentId: payment.id,
          }, { transaction: t })
        }
      }

      const sumPaid = alreadyPaid + value.amount
      const newStatus = deriveInvoiceStatus(sumPaid, invoice.grandTotal, invoice.status)

      await invoice.update({
        amountPaid: sumPaid,
        status: newStatus,
      }, { transaction: t })
    })

    if (failure) {
      return res
        .status(failure.status)
        .json({ success: false, error: { code: failure.code, message: failure.message } })
    }

    const full = await Invoice.findByPk(req.params.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: InvoicePayment, as: 'payments' },
      ],
    })

    return res.status(201).json({
      success: true,
      data: serializeInvoice(full, full.items, full.payments),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function deleteInvoicePayment(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!invoice) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } })

    const payment = await InvoicePayment.findOne({
      where: { id: req.params.paymentId, invoiceId: invoice.id },
    })
    if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } })

    await sequelize.transaction(async (t) => {
      await DealPayment.destroy({ where: { invoicePaymentId: payment.id }, transaction: t })
      await payment.destroy({ transaction: t })

      const remaining = await InvoicePayment.findAll({ where: { invoiceId: invoice.id }, transaction: t })
      const sumPaid = remaining.reduce((s, p) => s + Number(p.amount), 0)
      const newStatus = deriveInvoiceStatus(sumPaid, invoice.grandTotal, invoice.status)

      await invoice.update({ amountPaid: sumPaid, status: newStatus }, { transaction: t })
    })

    const full = await Invoice.findByPk(invoice.id, {
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: InvoicePayment, as: 'payments' },
      ],
    })

    return res.json({
      success: true,
      data: serializeInvoice(full, full.items, full.payments),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function deleteInvoice(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await Invoice.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    }

    await sequelize.transaction(async (transaction) => {
      const paymentIds = (
        await InvoicePayment.findAll({ where: { invoiceId: row.id }, attributes: ['id'], transaction })
      ).map((p) => p.id)
      if (paymentIds.length) {
        await DealPayment.destroy({ where: { invoicePaymentId: paymentIds }, transaction })
      }
      await InvoicePayment.destroy({ where: { invoiceId: row.id }, transaction })
      await InvoiceItem.destroy({ where: { invoiceId: row.id }, transaction })
      const linkedQuotes = await Quotation.findAll({
        where: { convertedInvoiceId: row.id, workspaceId, companyId: req.user.companyId },
        transaction,
      })
      for (const q of linkedQuotes) {
        await q.update(
          {
            convertedInvoiceId: null,
            ...(q.status === 'converted' ? { status: 'accepted' } : {}),
          },
          { transaction },
        )
      }
      await row.destroy({ transaction })
    })

    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
