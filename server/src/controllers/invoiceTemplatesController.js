import Joi from 'joi'
import { InvoiceTemplate } from '../models/index.js'
import { requireWorkspaceFromRequest } from '../services/workspaceScope.js'

const templateSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  code: Joi.string().trim().max(64).required(),
  templateType: Joi.string().valid('gst', 'vat', 'proforma', 'general').default('general'),
  numberPrefix: Joi.string().trim().max(32).default('INV'),
  nextNumber: Joi.number().integer().min(1).default(1001),
  defaultCurrency: Joi.string().length(3).default('USD'),
  layoutPreset: Joi.number().integer().min(1).max(8).default(1),
  themeStyle: Joi.string().trim().max(32).allow('', null),
  autoNumbering: Joi.boolean().default(true),
  defaultPaymentTerms: Joi.string().trim().allow('', null),
  sectionSettings: Joi.object().unknown(true).allow(null),
  taxProfile: Joi.object().unknown(true).allow(null),
  status: Joi.string().valid('active', 'inactive', 'draft').default('active'),
})

const patchSchema = Joi.object({
  name: Joi.string().trim().max(200),
  code: Joi.string().trim().max(64),
  templateType: Joi.string().valid('gst', 'vat', 'proforma', 'general'),
  numberPrefix: Joi.string().trim().max(32),
  nextNumber: Joi.number().integer().min(1),
  defaultCurrency: Joi.string().length(3),
  layoutPreset: Joi.number().integer().min(1).max(8),
  themeStyle: Joi.string().trim().max(32).allow('', null),
  autoNumbering: Joi.boolean(),
  defaultPaymentTerms: Joi.string().trim().allow('', null),
  sectionSettings: Joi.object().unknown(true).allow(null),
  taxProfile: Joi.object().unknown(true).allow(null),
  status: Joi.string().valid('active', 'inactive', 'draft'),
})
  .unknown(false)
  .min(1)

function serialize(t) {
  return typeof t.toJSON === 'function' ? t.toJSON() : t
}

export async function listInvoiceTemplates(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const rows = await InvoiceTemplate.findAll({
      where: { workspaceId, companyId: req.user.companyId },
      order: [['updatedAt', 'DESC']],
    })
    return res.json({ success: true, data: { items: rows.map(serialize) }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function getInvoiceTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await InvoiceTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    return res.json({ success: true, data: serialize(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function createInvoiceTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = templateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const created = await InvoiceTemplate.create({
      ...value,
      sectionSettings: value.sectionSettings ?? { showBankDetails: true },
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

export async function patchInvoiceTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const { error, value } = patchSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })
    }
    const row = await InvoiceTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    await row.update(value)
    return res.json({ success: true, data: serialize(row), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function deleteInvoiceTemplate(req, res, next) {
  try {
    const { workspaceId } = await requireWorkspaceFromRequest(req)
    const row = await InvoiceTemplate.findOne({
      where: { id: req.params.id, workspaceId, companyId: req.user.companyId },
    })
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } })
    await row.destroy()
    return res.json({ success: true, data: { deleted: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
