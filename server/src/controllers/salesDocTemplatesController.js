import Joi from 'joi'
import { SalesDocTemplate } from '../models/index.js'
import { requireWorkspaceFromRequest } from '../services/workspaceScope.js'

const SHARED_CREATE = {
  name: Joi.string().trim().max(200).required(),
  code: Joi.string().trim().max(64).required(),
  defaultCurrency: Joi.string().length(3).default('USD'),
  status: Joi.string().valid('active', 'inactive', 'draft').default('active'),
  layoutPreset: Joi.number().integer().min(1).max(8).default(1),
  defaultPaymentTerms: Joi.string().trim().allow('', null),
  sectionSettings: Joi.object().unknown(true).allow(null),
}

const SHARED_PATCH = {
  name: Joi.string().trim().max(200),
  code: Joi.string().trim().max(64),
  defaultCurrency: Joi.string().length(3),
  status: Joi.string().valid('active', 'inactive', 'draft'),
  layoutPreset: Joi.number().integer().min(1).max(8),
  defaultPaymentTerms: Joi.string().trim().allow('', null),
  sectionSettings: Joi.object().unknown(true).allow(null),
}

const quotationCreateSchema = Joi.object({
  ...SHARED_CREATE,
  docType: Joi.string().valid('quotation').required(),
  category: Joi.string().trim().max(64).allow('', null),
  language: Joi.string().trim().max(16).default('en'),
  defaultTaxType: Joi.string().valid('gst', 'vat', 'none').default('none'),
  defaultValidityDays: Joi.number().integer().min(1).max(3650).default(30),
  watermark: Joi.string().valid('draft', 'approved', 'none').default('none'),
  themeColor: Joi.string().trim().max(16).allow('', null),
  fontFamily: Joi.string().trim().max(120).allow('', null),
  logoOverrideUrl: Joi.string().trim().max(512).allow('', null),
  accentOverride: Joi.string().trim().max(16).allow('', null),
  defaultTermsBlocks: Joi.array().items(Joi.object()).allow(null),
  defaultNotes: Joi.string().trim().allow('', null),
  showSku: Joi.boolean().default(false),
  showHsn: Joi.boolean().default(false),
  showDiscount: Joi.boolean().default(true),
  showTaxPerLine: Joi.boolean().default(true),
  approvalRules: Joi.object().unknown(true).allow(null),
})

const invoiceCreateSchema = Joi.object({
  ...SHARED_CREATE,
  docType: Joi.string().valid('invoice').required(),
  templateType: Joi.string().valid('gst', 'vat', 'proforma', 'general').default('general'),
  numberPrefix: Joi.string().trim().max(32).default('INV'),
  nextNumber: Joi.number().integer().min(1).default(1001),
  themeStyle: Joi.string().trim().max(32).allow('', null),
  autoNumbering: Joi.boolean().default(true),
  taxProfile: Joi.object().unknown(true).allow(null),
})

const quotationPatchSchema = Joi.object({
  ...SHARED_PATCH,
  category: Joi.string().trim().max(64).allow('', null),
  language: Joi.string().trim().max(16),
  defaultTaxType: Joi.string().valid('gst', 'vat', 'none'),
  defaultValidityDays: Joi.number().integer().min(1).max(3650),
  watermark: Joi.string().valid('draft', 'approved', 'none'),
  themeColor: Joi.string().trim().max(16).allow('', null),
  fontFamily: Joi.string().trim().max(120).allow('', null),
  logoOverrideUrl: Joi.string().trim().max(512).allow('', null),
  accentOverride: Joi.string().trim().max(16).allow('', null),
  defaultTermsBlocks: Joi.array().items(Joi.object()).allow(null),
  defaultNotes: Joi.string().trim().allow('', null),
  showSku: Joi.boolean(),
  showHsn: Joi.boolean(),
  showDiscount: Joi.boolean(),
  showTaxPerLine: Joi.boolean(),
  approvalRules: Joi.object().unknown(true).allow(null),
})
  .unknown(false)
  .min(1)

const invoicePatchSchema = Joi.object({
  ...SHARED_PATCH,
  templateType: Joi.string().valid('gst', 'vat', 'proforma', 'general'),
  numberPrefix: Joi.string().trim().max(32),
  nextNumber: Joi.number().integer().min(1),
  themeStyle: Joi.string().trim().max(32).allow('', null),
  autoNumbering: Joi.boolean(),
  taxProfile: Joi.object().unknown(true).allow(null),
})
  .unknown(false)
  .min(1)

function createSchemaFor(docType) {
  return docType === 'invoice' ? invoiceCreateSchema : quotationCreateSchema
}

function patchSchemaFor(docType) {
  return docType === 'invoice' ? invoicePatchSchema : quotationPatchSchema
}

function serialize(t) {
  return typeof t.toJSON === 'function' ? t.toJSON() : t
}

export async function listSalesDocTemplates(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const where = { workspaceId, companyId: req.user.companyId }
    if (req.query.docType === 'quotation' || req.query.docType === 'invoice') {
      where.docType = req.query.docType
    }
    const rows = await SalesDocTemplate.findAll({ where, order: [['updatedAt', 'DESC']] })
    return res.json({ success: true, data: { items: rows.map(serialize) }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getSalesDocTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await SalesDocTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    return res.json({ success: true, data: serialize(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createSalesDocTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const docType = req.body?.docType
    if (docType !== 'quotation' && docType !== 'invoice') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: '"docType" must be one of [quotation, invoice]' },
      })
    }
    const { error, value } = createSchemaFor(docType).validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const created = await SalesDocTemplate.create({
      ...value,
      sectionSettings:
        docType === 'invoice' ? (value.sectionSettings ?? { showBankDetails: true }) : value.sectionSettings,
      workspaceId,
      companyId: req.user.companyId,
    })
    return res.status(201).json({ success: true, data: serialize(created), meta: {} })
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Template code must be unique in workspace' },
      })
    }
    return next(e)
  }
}

export async function patchSalesDocTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await SalesDocTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })

    if (req.body?.docType && req.body.docType !== row.docType) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'docType cannot be changed after creation' },
      })
    }

    const { error, value } = patchSchemaFor(row.docType).validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    await row.update(value)
    return res.json({ success: true, data: serialize(row), meta: {} })
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Template code must be unique in workspace' },
      })
    }
    return next(e)
  }
}

export async function deleteSalesDocTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await SalesDocTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    await row.destroy()
    return res.json({ success: true, data: { deleted: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
