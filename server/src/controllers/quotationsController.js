import Joi from 'joi'
import { Op, Transaction } from 'sequelize'
import {
  sequelize,
  Quotation,
  QuotationItem,
  SalesDocTemplate,
  WorkspaceBillingProfile,
  Invoice,
  InvoiceItem,
  Lead,
  Deal,
} from '../models/index.js'
import { requireWorkspaceFromRequest } from '../services/workspaceScope.js'
import { aggregateQuotationTotals } from '../services/salesTotals.js'
import { buildDocNumber, allocateInvoiceNumber } from '../services/docNumberFormat.js'
import { buildCustomerSnapshotFromLead, mergeBillingIntoPaymentSnapshot } from '../services/salesCustomerSnapshot.js'
import { recordQuotationCreatedOnLead, recordInvoiceCreatedOnLead } from '../services/leadSalesDocActivity.js'
import { resolveLeadAndDealForSalesDoc } from '../services/salesDocLeadDealResolve.js'
import { enrichSalesDocListRow } from '../services/salesDocListSerialize.js'

const listIncludes = [
  { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName', 'company', 'email'], required: false },
  { model: Deal, as: 'deal', attributes: ['id', 'name', 'stage'], required: false },
]

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
  billingPeriod: Joi.string().trim().max(64).allow('', null),
  duration: Joi.string().trim().max(64).allow('', null),
})

const createSchema = Joi.object({
  leadId: Joi.string().uuid().optional(),
  dealId: Joi.string().uuid().optional(),
  quotationTemplateId: Joi.string().uuid().allow(null),
  ownerUserId: Joi.string().uuid().allow(null),
  issueDate: Joi.string().isoDate().required(),
  expiryDate: Joi.string().isoDate().allow(null),
  reference: Joi.string().trim().max(120).allow('', null),
  purchaseOrderRef: Joi.string().trim().max(120).allow('', null),
  customerSnapshot: Joi.object().unknown(true).allow(null),
  items: Joi.array().items(lineSchema).min(1).required(),
  shipping: Joi.number().default(0),
  adjustment: Joi.number().default(0),
  currency: Joi.string().length(3).default('USD'),
  notes: Joi.string().trim().allow('', null),
  termsSnapshot: Joi.string().trim().allow('', null),
  status: Joi.string()
    .valid('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted')
    .default('draft'),
  layoutPreset: Joi.number().integer().min(1).max(8).allow(null),
  preparedByName: Joi.string().trim().max(160).allow('', null),
  documentTheme: documentThemeSchema,
})
  .or('leadId', 'dealId')
  .messages({
    'object.missing': 'Either leadId or dealId is required',
  })

const patchSchema = Joi.object({
  dealId: Joi.string().uuid().allow(null),
  quotationTemplateId: Joi.string().uuid().allow(null),
  ownerUserId: Joi.string().uuid().allow(null),
  issueDate: Joi.string().isoDate(),
  expiryDate: Joi.string().isoDate().allow(null),
  reference: Joi.string().trim().max(120).allow('', null),
  purchaseOrderRef: Joi.string().trim().max(120).allow('', null),
  customerSnapshot: Joi.object().unknown(true).allow(null),
  items: Joi.array().items(lineSchema).min(1),
  shipping: Joi.number(),
  adjustment: Joi.number(),
  currency: Joi.string().length(3),
  notes: Joi.string().trim().allow('', null),
  termsSnapshot: Joi.string().trim().allow('', null),
  status: Joi.string().valid('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'),
  layoutPreset: Joi.number().integer().min(1).max(8).allow(null),
  preparedByName: Joi.string().trim().max(160).allow('', null),
  documentTheme: documentThemeSchema,
}).min(1)

function serializeQuotation(q, items = []) {
  const plain = typeof q.toJSON === 'function' ? q.toJSON() : q
  return {
    ...plain,
    items: items.map((it) => (typeof it.toJSON === 'function' ? it.toJSON() : it)),
  }
}

export async function listQuotations(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const leadId = req.query.leadId || null
    const dealId = req.query.dealId || null
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))
    const offset = (page - 1) * limit

    const QUOTATION_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted']
    const status = QUOTATION_STATUSES.includes(req.query.status) ? req.query.status : null
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

    const { rows, count } = await Quotation.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: listIncludes,
    })

    const summaryRows = await Quotation.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('Quotation.id')), 'cnt'],
        [sequelize.fn('SUM', sequelize.col('grand_total')), 'total'],
      ],
      group: ['status'],
      raw: true,
    })
    const byStatus = {}
    let totalValue = 0
    for (const r of summaryRows) {
      const cnt = Number(r.cnt) || 0
      const total = Number(r.total) || 0
      byStatus[r.status] = { count: cnt, total }
      totalValue += total
    }

    return res.json({
      success: true,
      data: {
        items: rows.map((r) => enrichSalesDocListRow(serializeQuotation(r), r)),
        total: count,
        page,
        limit,
      },
      meta: { summary: { byStatus, totalValue, totalCount: count } },
    })
  } catch (e) {
    return next(e)
  }
}

export async function getQuotation(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await Quotation.findOne({
      where: {
        id: req.params.id,
        workspaceId,
        companyId: req.user.companyId,
      },
      include: [{ model: QuotationItem, as: 'items' }],
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    return res.json({ success: true, data: serializeQuotation(row, row.items), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createQuotation(req, res, next) {
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
    if (value.quotationTemplateId) {
      template = await SalesDocTemplate.findOne({
        where: {
          id: value.quotationTemplateId,
          workspaceId,
          companyId: req.user.companyId,
          docType: 'quotation',
        },
      })
      if (!template) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid template' } })
      }
    }

    const totals = aggregateQuotationTotals(value.items, {
      shipping: value.shipping,
      adjustment: value.adjustment,
    })

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

    const termsSnapshot =
      value.termsSnapshot != null
        ? value.termsSnapshot
        : template?.defaultTermsBlocks?.length
          ? JSON.stringify(template.defaultTermsBlocks)
          : template?.defaultPaymentTerms || null

    const notes = value.notes != null ? value.notes : template?.defaultNotes || null

    const issueDate = value.issueDate.slice(0, 10)
    const expiryDate = value.expiryDate ? value.expiryDate.slice(0, 10) : null

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

      const qNum = buildDocNumber({
        prefix: billing.quotationPrefix || 'QT',
        format: billing.quotationNumberFormat,
        seq: billing.quotationNextSeq,
        issueDate,
      })
      await billing.increment('quotationNextSeq', { by: 1, transaction })

      const q = await Quotation.create(
        {
          workspaceId,
          companyId: req.user.companyId,
          quotationTemplateId: template?.id || value.quotationTemplateId || null,
          leadId: resolvedLeadId,
          dealId: resolvedDealId,
          ownerUserId: value.ownerUserId || req.user.id,
          quotationNumber: qNum,
          issueDate,
          expiryDate,
          reference: value.reference || null,
          purchaseOrderRef: value.purchaseOrderRef || null,
          customerSnapshot,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shipping: totals.shipping,
          adjustment: totals.adjustment,
          grandTotal: totals.grandTotal,
          taxBreakdown: totals.taxBreakdown,
          currency: value.currency,
          status: value.status,
          termsSnapshot,
          notes,
          layoutPreset,
          preparedByName: value.preparedByName || null,
          documentTheme: value.documentTheme ?? null,
        },
        { transaction },
      )

      const itemRows = totals.items.map((it, idx) => ({
        quotationId: q.id,
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
        billingPeriod: it.billingPeriod || null,
        duration: it.duration || null,
      }))

      await QuotationItem.bulkCreate(itemRows, { transaction })

      return Quotation.findByPk(q.id, {
        transaction,
        include: [{ model: QuotationItem, as: 'items' }],
      })
    })

    await recordQuotationCreatedOnLead({
      leadId: resolvedLeadId,
      userId: req.user.id,
      quotation: created,
      dealId: resolvedDealId || null,
    })

    return res.status(201).json({
      success: true,
      data: serializeQuotation(created, created.items),
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function patchQuotation(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = patchSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }

    const row = await Quotation.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    if (row.status === 'converted') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Cannot edit converted quotation' },
      })
    }
    if (value.status === 'converted') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Status cannot be set to converted directly' },
      })
    }

    let totals = null
    if (value.items) {
      totals = aggregateQuotationTotals(value.items, {
        shipping: value.shipping ?? Number(row.shipping),
        adjustment: value.adjustment ?? Number(row.adjustment),
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
      if (value.expiryDate !== undefined) updates.expiryDate = value.expiryDate ? value.expiryDate.slice(0, 10) : null
      if (value.reference !== undefined) updates.reference = value.reference || null
      if (value.purchaseOrderRef !== undefined) updates.purchaseOrderRef = value.purchaseOrderRef || null
      if (value.customerSnapshot) updates.customerSnapshot = value.customerSnapshot
      if (value.currency) updates.currency = value.currency
      if (value.notes !== undefined) updates.notes = value.notes || null
      if (value.termsSnapshot !== undefined) updates.termsSnapshot = value.termsSnapshot || null
      if (value.status) updates.status = value.status
      if (value.ownerUserId !== undefined) updates.ownerUserId = value.ownerUserId || null
      if (value.layoutPreset != null) updates.layoutPreset = value.layoutPreset
      if (value.preparedByName !== undefined) updates.preparedByName = value.preparedByName || null
      if (value.documentTheme !== undefined) updates.documentTheme = value.documentTheme || null

      if (totals) {
        updates.subtotal = totals.subtotal
        updates.discountTotal = totals.discountTotal
        updates.shipping = totals.shipping
        updates.adjustment = totals.adjustment
        updates.grandTotal = totals.grandTotal
        updates.taxBreakdown = totals.taxBreakdown
      }

      await row.update(updates, { transaction })

      if (totals) {
        await QuotationItem.destroy({ where: { quotationId: row.id }, transaction })
        await QuotationItem.bulkCreate(
          totals.items.map((it, idx) => ({
            quotationId: row.id,
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
            billingPeriod: it.billingPeriod || null,
            duration: it.duration || null,
          })),
          { transaction },
        )
      }
    })

    const fresh = await Quotation.findByPk(row.id, {
      include: [{ model: QuotationItem, as: 'items' }],
    })
    return res.json({ success: true, data: serializeQuotation(fresh, fresh.items), meta: {} })
  } catch (e) {
    return next(e)
  }
}

const convertSchema = Joi.object({
  invoiceTemplateId: Joi.string().uuid().allow(null),
  issueDate: Joi.string().isoDate().allow(null),
  dueDate: Joi.string().isoDate().allow(null),
  layoutPreset: Joi.number().integer().min(1).max(8).allow(null),
})

export async function convertQuotationToInvoice(req, res, next) {
  try {
    const { workspace, workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = convertSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }

    let invTemplate = null
    if (value.invoiceTemplateId) {
      invTemplate = await SalesDocTemplate.findOne({
        where: {
          id: value.invoiceTemplateId,
          workspaceId,
          companyId: req.user.companyId,
          docType: 'invoice',
        },
      })
      if (!invTemplate) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Invalid invoice template' } })
      }
    }

    const billingForPay = await WorkspaceBillingProfile.findOne({ where: { workspaceId } })
    const paymentSnapshot = mergeBillingIntoPaymentSnapshot(billingForPay)

    let quotation = null
    let failure = null
    const invoice = await sequelize.transaction(async (transaction) => {
      // Lock the quotation row so two concurrent converts cannot both create an invoice
      quotation = await Quotation.findOne({
        where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      })
      if (!quotation) {
        failure = { status: 404, code: 'NOT_FOUND', message: 'Not found' }
        return null
      }
      if (quotation.convertedInvoiceId || quotation.status === 'converted') {
        failure = { status: 400, code: 'ALREADY_CONVERTED', message: 'Quotation already converted' }
        return null
      }
      if (quotation.status === 'rejected') {
        failure = {
          status: 400,
          code: 'INVALID_STATE',
          message: 'A rejected quotation cannot be converted to an invoice',
        }
        return null
      }

      const quotationItems = await QuotationItem.findAll({
        where: { quotationId: quotation.id },
        order: [['sortOrder', 'ASC']],
        transaction,
      })

      const issueDate = value.issueDate ? value.issueDate.slice(0, 10) : quotation.issueDate
      const layoutPreset =
        value.layoutPreset != null
          ? value.layoutPreset
          : invTemplate?.layoutPreset != null
            ? invTemplate.layoutPreset
            : quotation.layoutPreset

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

      const invoiceNumber = await allocateInvoiceNumber({
        billing,
        template: invTemplate,
        issueDate,
        transaction,
      })

      const totals = aggregateQuotationTotals(
        quotationItems.map((it) => ({
          name: it.name,
          sku: it.sku,
          description: it.description,
          hsnSac: it.hsnSac,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          discountAmount: it.discountAmount,
          taxPct: it.taxPct,
          taxType: it.taxType,
        })),
        { shipping: Number(quotation.shipping) || 0, adjustment: Number(quotation.adjustment) || 0 },
      )

      const inv = await Invoice.create(
        {
          workspaceId,
          companyId: req.user.companyId,
          invoiceTemplateId: invTemplate?.id || null,
          quotationId: quotation.id,
          leadId: quotation.leadId,
          dealId: quotation.dealId || null,
          ownerUserId: quotation.ownerUserId || req.user.id,
          invoiceNumber,
          issueDate,
          dueDate: value.dueDate ? value.dueDate.slice(0, 10) : null,
          purchaseOrderRef: quotation.purchaseOrderRef,
          reference: quotation.reference,
          customerSnapshot: quotation.customerSnapshot,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shipping: totals.shipping,
          adjustment: totals.adjustment,
          roundOff: 0,
          grandTotal: totals.grandTotal,
          taxFinancial: totals.taxBreakdown,
          currency: quotation.currency,
          status: 'issued',
          paymentBlockSnapshot: paymentSnapshot,
          termsSnapshot: quotation.termsSnapshot,
          notes: quotation.notes,
          layoutPreset,
          documentTheme: quotation.documentTheme ?? null,
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
        })),
        { transaction },
      )

      await quotation.update(
        {
          status: 'converted',
          convertedInvoiceId: inv.id,
        },
        { transaction },
      )

      return Invoice.findByPk(inv.id, {
        transaction,
        include: [{ model: InvoiceItem, as: 'items' }],
      })
    })

    if (failure) {
      return res
        .status(failure.status)
        .json({ success: false, error: { code: failure.code, message: failure.message } })
    }

    await recordInvoiceCreatedOnLead({
      leadId: quotation.leadId,
      userId: req.user.id,
      invoice,
      extraMetadata: {
        fromQuotationId: quotation.id,
        fromQuotationNumber: quotation.quotationNumber || null,
      },
      dealId: quotation.dealId || null,
    })

    return res.status(201).json({
      success: true,
      data: {
        ...invoice.toJSON(),
        items: invoice.items?.map((x) => x.toJSON()) || [],
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function deleteQuotation(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await Quotation.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    }

    await sequelize.transaction(async (transaction) => {
      await QuotationItem.destroy({ where: { quotationId: row.id }, transaction })
      if (row.convertedInvoiceId) {
        await Invoice.update(
          { quotationId: null },
          { where: { id: row.convertedInvoiceId, workspaceId, companyId: req.user.companyId }, transaction },
        )
      }
      await row.destroy({ transaction })
    })

    return res.json({ success: true, data: { id: req.params.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
