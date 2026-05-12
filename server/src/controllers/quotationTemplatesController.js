import Joi from 'joi'
import { QuotationTemplate } from '../models/index.js'
import { requireWorkspaceFromRequest } from '../services/workspaceScope.js'

const templateSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  code: Joi.string().trim().max(64).required(),
  category: Joi.string().trim().max(64).allow('', null),
  defaultCurrency: Joi.string().length(3).default('USD'),
  language: Joi.string().trim().max(16).default('en'),
  status: Joi.string().valid('active', 'inactive', 'draft').default('active'),
  defaultTaxType: Joi.string().valid('gst', 'vat', 'none').default('none'),
  defaultValidityDays: Joi.number().integer().min(1).max(3650).default(30),
  defaultPaymentTerms: Joi.string().trim().allow('', null),
  watermark: Joi.string().valid('draft', 'approved', 'none').default('none'),
  themeColor: Joi.string().trim().max(16).allow('', null),
  fontFamily: Joi.string().trim().max(120).allow('', null),
  layoutPreset: Joi.number().integer().min(1).max(8).default(1),
  sectionSettings: Joi.object().unknown(true).allow(null),
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

const patchSchema = Joi.object({
  name: Joi.string().trim().max(200),
  code: Joi.string().trim().max(64),
  category: Joi.string().trim().max(64).allow('', null),
  defaultCurrency: Joi.string().length(3),
  language: Joi.string().trim().max(16),
  status: Joi.string().valid('active', 'inactive', 'draft'),
  defaultTaxType: Joi.string().valid('gst', 'vat', 'none'),
  defaultValidityDays: Joi.number().integer().min(1).max(3650),
  defaultPaymentTerms: Joi.string().trim().allow('', null),
  watermark: Joi.string().valid('draft', 'approved', 'none'),
  themeColor: Joi.string().trim().max(16).allow('', null),
  fontFamily: Joi.string().trim().max(120).allow('', null),
  layoutPreset: Joi.number().integer().min(1).max(8),
  sectionSettings: Joi.object().unknown(true).allow(null),
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

function serialize(t) {
  const p = typeof t.toJSON === 'function' ? t.toJSON() : t
  return p
}

export async function listQuotationTemplates(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const rows = await QuotationTemplate.findAll({
      where: { workspaceId, companyId: req.user.companyId },
      order: [['updatedAt', 'DESC']],
    })
    return res.json({ success: true, data: { items: rows.map(serialize) }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getQuotationTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await QuotationTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    return res.json({ success: true, data: serialize(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createQuotationTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = templateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const created = await QuotationTemplate.create({
      ...value,
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

export async function patchQuotationTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = patchSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const row = await QuotationTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    await row.update(value)
    return res.json({ success: true, data: serialize(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteQuotationTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await QuotationTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    await row.destroy()
    return res.json({ success: true, data: { deleted: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
