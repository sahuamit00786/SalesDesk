import { saveWhatsAppSettingsSchema } from '../validations/whatsapp.js'
import * as whatsappSettingsService from '../services/whatsapp/whatsappSettingsService.js'
import { httpError } from '../utils/httpError.js'

export async function getSettings(req, res, next) {
  try {
    const data = await whatsappSettingsService.getSettings(req.user.companyId)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function saveSettings(req, res, next) {
  try {
    const { error, value } = saveWhatsAppSettingsSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) throw httpError(400, 'VALIDATION', error.details.map((d) => d.message).join('; '))

    const data = await whatsappSettingsService.saveSettings(req.user.companyId, value)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function regenerateVerifyToken(req, res, next) {
  try {
    const data = await whatsappSettingsService.regenerateVerifyToken(req.user.companyId)
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
