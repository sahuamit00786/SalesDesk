import { randomBytes } from 'node:crypto'
import { Op } from 'sequelize'
import { WebForm, WebFormField } from '../models/index.js'

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeFieldInput(field, order) {
  return {
    type: String(field?.type || 'text'),
    label: stripHtml(field?.label || ''),
    placeholder: stripHtml(field?.placeholder || ''),
    helpText: stripHtml(field?.helpText || ''),
    defaultValue: stripHtml(field?.defaultValue || ''),
    isRequired: Boolean(field?.isRequired),
    isHidden: Boolean(field?.isHidden),
    order,
    width: field?.width === 'half' ? 'half' : 'full',
    options: Array.isArray(field?.options)
      ? field.options
          .slice(0, 50)
          .map((opt) => ({ label: stripHtml(opt?.label || ''), value: stripHtml(opt?.value || '') }))
          .filter((opt) => opt.label || opt.value)
      : null,
    showCountryCode: field?.showCountryCode !== false,
    defaultCountryCode: stripHtml(field?.defaultCountryCode || '+91') || '+91',
    minLength: Number.isFinite(field?.minLength) ? Number(field.minLength) : null,
    maxLength: Number.isFinite(field?.maxLength) ? Number(field.maxLength) : null,
    minValue: Number.isFinite(field?.minValue) ? Number(field.minValue) : null,
    maxValue: Number.isFinite(field?.maxValue) ? Number(field.maxValue) : null,
    pattern: stripHtml(field?.pattern || ''),
    patternError: stripHtml(field?.patternError || ''),
    crmField: stripHtml(field?.crmField || ''),
  }
}

export async function generateUniquePublicToken() {
  for (let i = 0; i < 5; i += 1) {
    const token = randomBytes(32).toString('hex')
    const exists = await WebForm.findOne({ where: { publicToken: token }, attributes: ['id'] })
    if (!exists) return token
  }
  throw new Error('Unable to generate unique public token')
}

export async function replaceFormFields(formId, fields = []) {
  await WebFormField.destroy({ where: { formId } })
  if (!Array.isArray(fields) || !fields.length) return []
  const rows = fields.map((field, index) => sanitizeFieldInput(field, index))
  await WebFormField.bulkCreate(rows.map((row) => ({ ...row, formId })))
  return WebFormField.findAll({ where: { formId }, order: [['order', 'ASC']] })
}

export function sanitizeFormInput(payload = {}) {
  return {
    name: stripHtml(payload?.name || ''),
    description: stripHtml(payload?.description || '') || null,
    status: ['draft', 'active', 'paused', 'archived'].includes(payload?.status) ? payload.status : 'draft',
    formTitle: stripHtml(payload?.formTitle || '') || null,
    formSubtitle: stripHtml(payload?.formSubtitle || '') || null,
    submitButtonText: stripHtml(payload?.submitButtonText || 'Submit') || 'Submit',
    primaryColor: /^#[0-9A-Fa-f]{6}$/.test(String(payload?.primaryColor || '')) ? payload.primaryColor : '#3b73f5',
    textColor: /^#[0-9A-Fa-f]{6}$/.test(String(payload?.textColor || '')) ? payload.textColor : '#0f1117',
    backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(String(payload?.backgroundColor || '')) ? payload.backgroundColor : '#ffffff',
    formWidth: Number.isFinite(payload?.formWidth) ? Math.max(320, Math.min(1200, Number(payload.formWidth))) : 760,
    fontFamily: stripHtml(payload?.fontFamily || 'Plus Jakarta Sans') || 'Plus Jakarta Sans',
    borderRadius: ['none', 'sm', 'md', 'lg'].includes(payload?.borderRadius) ? payload.borderRadius : 'md',
    thankyouType: ['message', 'redirect'].includes(payload?.thankyouType) ? payload.thankyouType : 'message',
    thankyouMessage: stripHtml(payload?.thankyouMessage || 'Thank you! We will be in touch soon.') || 'Thank you! We will be in touch soon.',
    thankyouRedirectUrl: payload?.thankyouType === 'redirect' ? String(payload?.thankyouRedirectUrl || '').trim() || null : null,
    displayType: ['inline', 'popup', 'slidein'].includes(payload?.displayType) ? payload.displayType : 'inline',
    popupTrigger: ['exit_intent', 'time_delay', 'scroll_depth', 'button_click'].includes(payload?.popupTrigger) ? payload.popupTrigger : 'time_delay',
    popupDelay: Number.isFinite(payload?.popupDelay) ? Number(payload.popupDelay) : 5,
    popupScrollPct: Number.isFinite(payload?.popupScrollPct) ? Number(payload.popupScrollPct) : 50,
    popupButtonSelector: stripHtml(payload?.popupButtonSelector || '') || null,
    popupOverlay: payload?.popupOverlay !== false,
    popupPosition: ['center', 'bottom-right', 'bottom-left', 'bottom-center'].includes(payload?.popupPosition) ? payload.popupPosition : 'center',
    defaultStatus: stripHtml(payload?.defaultStatus || 'new') || 'new',
    defaultSource: 'web_form',
    defaultAssignedTo: payload?.defaultAssignedTo || null,
    autoAssign: Boolean(payload?.autoAssign),
    notifyOnSubmission: Boolean(payload?.notifyOnSubmission),
    notificationRecipients: Array.isArray(payload?.notificationRecipients)
      ? payload.notificationRecipients.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 20)
      : [],
    notificationSubject: stripHtml(payload?.notificationSubject || '') || null,
    sendConfirmationEmail: Boolean(payload?.sendConfirmationEmail),
    confirmationSubject: stripHtml(payload?.confirmationSubject || '') || null,
    confirmationBody: String(payload?.confirmationBody || '').trim() || null,
    recaptchaEnabled: payload?.recaptchaEnabled !== false,
    recaptchaSiteKey: stripHtml(payload?.recaptchaSiteKey || '') || null,
    recaptchaSecretKey: stripHtml(payload?.recaptchaSecretKey || '') || null,
    honeypotEnabled: payload?.honeypotEnabled !== false,
    allowedDomains: Array.isArray(payload?.allowedDomains)
      ? payload.allowedDomains.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean).slice(0, 25)
      : [],
    autoTags: Array.isArray(payload?.autoTags) ? payload.autoTags.filter(Boolean) : [],
  }
}

export async function listWorkspaceForms(workspaceId, search = '') {
  const where = { workspaceId }
  if (search?.trim()) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search.trim()}%` } },
      { formTitle: { [Op.like]: `%${search.trim()}%` } },
    ]
  }
  return WebForm.findAll({
    where,
    attributes: ['id', 'name', 'status', 'formTitle', 'displayType', 'totalViews', 'totalSubmissions', 'updatedAt', 'publicToken'],
    order: [['updatedAt', 'DESC']],
  })
}
