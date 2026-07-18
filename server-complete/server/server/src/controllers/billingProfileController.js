import { WorkspaceBillingProfile } from '../models/index.js'
import { DOC_NUMBER_FORMATS } from '../services/docNumberFormat.js'
import Joi from 'joi'

const patchSchema = Joi.object({
  legalName: Joi.string().trim().max(240).allow('', null),
  logoUrl: Joi.string().trim().max(512).allow('', null),
  taxIdLabel: Joi.string().trim().max(64).allow('', null),
  taxIdValue: Joi.string().trim().max(64).allow('', null),
  addressLine1: Joi.string().trim().max(255).allow('', null),
  addressLine2: Joi.string().trim().max(255).allow('', null),
  city: Joi.string().trim().max(120).allow('', null),
  state: Joi.string().trim().max(120).allow('', null),
  postalCode: Joi.string().trim().max(32).allow('', null),
  country: Joi.string().trim().max(2).allow('', null),
  phone: Joi.string().trim().max(64).allow('', null),
  email: Joi.string().trim().max(190).allow('', null),
  website: Joi.string().trim().max(255).allow('', null),
  bankName: Joi.string().trim().max(160).allow('', null),
  bankAccountHolderName: Joi.string().trim().max(240).allow('', null),
  bankBranch: Joi.string().trim().max(255).allow('', null),
  micrCode: Joi.string().trim().max(16).allow('', null),
  bankAccountType: Joi.string().trim().max(32).allow('', null),
  bankAccountNumber: Joi.string().trim().max(64).allow('', null),
  bankIfsc: Joi.string().trim().max(32).allow('', null),
  bankSwift: Joi.string().trim().max(32).allow('', null),
  upiId: Joi.string().trim().max(120).allow('', null),
  paymentLinkUrl: Joi.string().trim().max(512).allow('', null),
  paymentInstructions: Joi.string().trim().allow('', null),
  signatureImageUrl: Joi.string().trim().max(512).allow('', null),
  stampImageUrl: Joi.string().trim().max(512).allow('', null),
  quotationPrefix: Joi.string().trim().min(1).max(32),
  quotationNextSeq: Joi.number().integer().min(1).allow(null),
  quotationNumberFormat: Joi.string().valid(...DOC_NUMBER_FORMATS),
  invoicePrefix: Joi.string().trim().min(1).max(32),
  invoiceNextSeq: Joi.number().integer().min(1).allow(null),
  invoiceNumberFormat: Joi.string().valid(...DOC_NUMBER_FORMATS),
}).unknown(false)

// Columns that are NOT NULL — never coerce '' to null for these
const NON_NULLABLE_KEYS = new Set(['quotationPrefix', 'invoicePrefix', 'quotationNumberFormat', 'invoiceNumberFormat'])

function serialize(p) {
  if (!p) return null
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    legalName: p.legalName,
    logoUrl: p.logoUrl,
    taxIdLabel: p.taxIdLabel,
    taxIdValue: p.taxIdValue,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    city: p.city,
    state: p.state,
    postalCode: p.postalCode,
    country: p.country,
    phone: p.phone,
    email: p.email,
    website: p.website,
    bankName: p.bankName,
    bankAccountHolderName: p.bankAccountHolderName,
    bankBranch: p.bankBranch,
    micrCode: p.micrCode,
    bankAccountType: p.bankAccountType,
    bankAccountNumber: p.bankAccountNumber,
    bankIfsc: p.bankIfsc,
    bankSwift: p.bankSwift,
    upiId: p.upiId,
    paymentLinkUrl: p.paymentLinkUrl,
    paymentInstructions: p.paymentInstructions,
    signatureImageUrl: p.signatureImageUrl,
    stampImageUrl: p.stampImageUrl,
    quotationPrefix: p.quotationPrefix,
    quotationNextSeq: p.quotationNextSeq,
    quotationNumberFormat: p.quotationNumberFormat,
    invoicePrefix: p.invoicePrefix,
    invoiceNextSeq: p.invoiceNextSeq,
    invoiceNumberFormat: p.invoiceNumberFormat,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

export async function getBillingProfile(req, res, next) {
  try {
    const { workspace, workspaceId } = req
    const [profile] = await WorkspaceBillingProfile.findOrCreate({
      where: { workspaceId },
      defaults: {
        companyId: workspace.companyId,
        quotationPrefix: 'QT',
        quotationNextSeq: 1001,
        invoicePrefix: 'INV',
        invoiceNextSeq: 1001,
      },
    })
    return res.json({ success: true, data: serialize(profile), meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function patchBillingProfile(req, res, next) {
  try {
    const { workspace, workspaceId } = req
    const { error, value } = patchSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: error.message },
      })
    }

    const [profile] = await WorkspaceBillingProfile.findOrCreate({
      where: { workspaceId },
      defaults: {
        companyId: workspace.companyId,
        quotationPrefix: 'QT',
        quotationNextSeq: 1001,
        invoicePrefix: 'INV',
        invoiceNextSeq: 1001,
      },
    })

    const updates = { ...value }
    Object.keys(updates).forEach((k) => {
      if (updates[k] === '') {
        if (NON_NULLABLE_KEYS.has(k)) delete updates[k]
        else updates[k] = null
      }
    })

    await profile.update(updates)
    return res.json({ success: true, data: serialize(profile), meta: {} })
  } catch (e) {
    return next(e)
  }
}
