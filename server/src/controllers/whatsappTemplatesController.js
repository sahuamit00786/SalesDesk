import * as templatesService from '../services/whatsapp/whatsappTemplatesService.js'
import { createWhatsAppTemplateSchema } from '../validations/whatsappTemplates.js'
import { httpError } from '../utils/httpError.js'

export async function listTemplates(req, res, next) {
  try {
    const rows = await templatesService.listTemplates(req.user.companyId)
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
}

export async function createTemplate(req, res, next) {
  try {
    const { error, value } = createWhatsAppTemplateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) throw httpError(400, 'VALIDATION', error.details.map((d) => d.message).join('; '))
    const row = await templatesService.createTemplate(req.user.companyId, value, req.user.id)
    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
}

export async function syncTemplates(req, res, next) {
  try {
    const rows = await templatesService.syncTemplates(req.user.companyId)
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
}

export async function deleteTemplate(req, res, next) {
  try {
    await templatesService.deleteTemplate(req.user.companyId, req.params.id)
    res.json({ success: true, data: { id: req.params.id } })
  } catch (err) {
    next(err)
  }
}
