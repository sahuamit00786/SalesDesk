import { CompanyWhatsAppSettings } from '../models/index.js'
import { decryptSecret } from '../utils/secretCrypto.js'
import { verifyMetaSignature } from '../utils/whatsappSignature.js'
import { processWhatsAppWebhookPayload } from '../services/whatsapp/whatsappWebhookService.js'

/**
 * Each company owns its own Meta App/webhook subscription, so the callback URL
 * carries the companyId directly (`/webhooks/whatsapp/:companyId`) — company
 * lookup is a direct primary-key fetch, not a scan over stored tokens.
 */
export async function verifyWhatsAppWebhook(req, res) {
  const { companyId } = req.params
  const settings = await CompanyWhatsAppSettings.scope('withSecret').findOne({ where: { companyId } })

  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && settings?.webhookVerifyToken && token === settings.webhookVerifyToken) {
    return res.status(200).type('text/plain').send(challenge)
  }
  return res.status(403).end()
}

export async function receiveWhatsAppWebhook(req, res) {
  const { companyId } = req.params
  const settings = await CompanyWhatsAppSettings.scope('withSecret').findOne({ where: { companyId } })
  if (!settings) return res.status(404).end()

  if (settings.appSecretEncrypted) {
    const appSecret = decryptSecret(settings.appSecretEncrypted)
    const ok = verifyMetaSignature(req.rawBody, req.headers['x-hub-signature-256'], appSecret)
    if (!ok) return res.status(401).end()
  }

  // Ack immediately — Meta retries (and eventually disables) subscriptions that
  // respond slowly or with a non-2xx status. Processing continues after the response.
  res.status(200).end()

  processWhatsAppWebhookPayload({ companyId, settings, body: req.body }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[whatsapp-webhook] processing failed:', err?.message || err)
  })
}
