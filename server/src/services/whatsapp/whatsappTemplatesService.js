import { WhatsAppTemplate, CompanyWhatsAppSettings } from '../../models/index.js'
import { decryptSecret } from '../../utils/secretCrypto.js'
import { httpError } from '../../utils/httpError.js'
import { createMessageTemplate, listMessageTemplates, deleteMessageTemplate } from './whatsappGraphClient.js'

/** Unique, sorted variable indices referenced as {{1}}, {{2}}, … in a template string. */
export function extractVariableIndices(text) {
  const matches = [...String(text || '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
  return [...new Set(matches)].sort((a, b) => a - b)
}

/** Meta returns the literal string "NONE" for `rejected_reason` on non-rejected templates. */
function normalizeRejectionReason(reason) {
  if (!reason || String(reason).toUpperCase() === 'NONE') return null
  return reason
}

export function substituteVariables(text, values) {
  return String(text || '').replace(/\{\{(\d+)\}\}/g, (_, i) => {
    const v = values?.[Number(i) - 1]
    return v != null && v !== '' ? v : `{{${i}}}`
  })
}

async function requireVerifiedSettings(companyId) {
  const settings = await CompanyWhatsAppSettings.scope('withSecret').findOne({ where: { companyId } })
  if (!settings?.isVerified || !settings.wabaId || !settings.accessTokenEncrypted) {
    throw httpError(400, 'WHATSAPP_NOT_CONFIGURED', 'Connect WhatsApp Business API in Integrations before managing templates')
  }
  return settings
}

/** Meta's `components` shape for template *submission* (uses example values, not live params). */
function buildSubmissionComponents(template) {
  const components = []

  if (template.headerType === 'text' && template.headerText) {
    const headerVars = extractVariableIndices(template.headerText)
    components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: template.headerText,
      ...(headerVars.length
        ? { example: { header_text: [template.variableSamples?.header?.[0] || 'Example'] } }
        : {}),
    })
  }

  const bodyVars = extractVariableIndices(template.bodyText)
  components.push({
    type: 'BODY',
    text: template.bodyText,
    ...(bodyVars.length
      ? { example: { body_text: [bodyVars.map((i) => template.variableSamples?.body?.[i - 1] || `Example${i}`)] } }
      : {}),
  })

  if (template.footerText) components.push({ type: 'FOOTER', text: template.footerText })
  if (Array.isArray(template.buttons) && template.buttons.length) {
    components.push({ type: 'BUTTONS', buttons: template.buttons })
  }

  return components
}

export async function listTemplates(companyId) {
  return WhatsAppTemplate.findAll({ where: { companyId }, order: [['createdAt', 'DESC']] })
}

export async function createTemplate(companyId, payload, userId) {
  const settings = await requireVerifiedSettings(companyId)
  const accessToken = decryptSecret(settings.accessTokenEncrypted)

  const row = await WhatsAppTemplate.create({ companyId, createdBy: userId, status: 'draft', ...payload })

  try {
    const components = buildSubmissionComponents(row)
    const result = await createMessageTemplate({
      wabaId: settings.wabaId,
      accessToken,
      payload: { name: row.name, category: row.category, language: row.language, components },
    })
    await row.update({
      metaTemplateId: result?.id || null,
      status: String(result?.status || 'pending').toLowerCase(),
      lastSyncedAt: new Date(),
    })
  } catch (err) {
    await row.update({ status: 'rejected', rejectionReason: err.message || 'Submission failed' })
    throw err
  }
  return row
}

/** Pulls current review status for every template from Meta and upserts local rows. */
export async function syncTemplates(companyId) {
  const settings = await requireVerifiedSettings(companyId)
  const accessToken = decryptSecret(settings.accessTokenEncrypted)
  const result = await listMessageTemplates({ wabaId: settings.wabaId, accessToken })
  const metaTemplates = Array.isArray(result?.data) ? result.data : []

  for (const mt of metaTemplates) {
    const bodyComponent = mt.components?.find((c) => c.type === 'BODY')
    const [row] = await WhatsAppTemplate.findOrCreate({
      where: { companyId, name: mt.name, language: mt.language },
      defaults: {
        companyId,
        name: mt.name,
        category: mt.category || 'UTILITY',
        language: mt.language,
        bodyText: bodyComponent?.text || '',
        status: String(mt.status || 'pending').toLowerCase(),
        metaTemplateId: mt.id || null,
      },
    })
    await row.update({
      metaTemplateId: mt.id || row.metaTemplateId,
      status: String(mt.status || row.status).toLowerCase(),
      rejectionReason: normalizeRejectionReason(mt.rejected_reason),
      lastSyncedAt: new Date(),
    })
  }
  return listTemplates(companyId)
}

export async function deleteTemplate(companyId, templateId) {
  const template = await WhatsAppTemplate.findOne({ where: { id: templateId, companyId } })
  if (!template) throw httpError(404, 'NOT_FOUND', 'Template not found')

  if (template.metaTemplateId || template.status !== 'draft') {
    const settings = await requireVerifiedSettings(companyId)
    const accessToken = decryptSecret(settings.accessTokenEncrypted)
    await deleteMessageTemplate({ wabaId: settings.wabaId, accessToken, name: template.name }).catch(() => {})
  }
  await template.destroy()
}
