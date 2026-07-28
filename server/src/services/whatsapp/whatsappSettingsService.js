import crypto from 'crypto'
import { CompanyWhatsAppSettings } from '../../models/index.js'
import { encryptSecret } from '../../utils/secretCrypto.js'
import { httpError } from '../../utils/httpError.js'
import { getPhoneNumberInfo, subscribeAppToWaba } from './whatsappGraphClient.js'

function apiBaseUrl() {
  return process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`
}

function callbackUrlForCompany(companyId) {
  return `${apiBaseUrl()}/webhooks/whatsapp/${companyId}`
}

function generateVerifyToken() {
  return crypto.randomBytes(24).toString('hex')
}

export async function getSettings(companyId) {
  const row = await CompanyWhatsAppSettings.findOne({ where: { companyId } })
  return {
    phoneNumberId: row?.phoneNumberId || null,
    wabaId: row?.wabaId || null,
    displayPhoneNumber: row?.displayPhoneNumber || null,
    verifiedName: row?.verifiedName || null,
    status: row?.status || 'not_configured',
    isVerified: Boolean(row?.isVerified),
    lastVerifiedAt: row?.lastVerifiedAt || null,
    lastError: row?.lastError || null,
    hasAppSecret: Boolean(row?.appSecretEncrypted),
    webhookVerifyToken: row?.webhookVerifyToken || null,
    callbackUrl: callbackUrlForCompany(companyId),
  }
}

export async function saveSettings(companyId, { phoneNumberId, wabaId, accessToken, appSecret }) {
  const existing = await CompanyWhatsAppSettings.scope('withSecret').findOne({ where: { companyId } })

  let phoneInfo
  try {
    phoneInfo = await getPhoneNumberInfo(phoneNumberId, accessToken)
  } catch (err) {
    if (existing) {
      await existing.update({ status: 'error', isVerified: false, lastError: err.message || 'Verification failed' })
    }
    throw httpError(422, 'WHATSAPP_VERIFY_FAILED', err.message || 'Could not verify these WhatsApp credentials with Meta')
  }

  const webhookVerifyToken = existing?.webhookVerifyToken || generateVerifyToken()
  const payload = {
    companyId,
    phoneNumberId,
    wabaId,
    displayPhoneNumber: phoneInfo?.display_phone_number || null,
    verifiedName: phoneInfo?.verified_name || null,
    accessTokenEncrypted: encryptSecret(accessToken),
    appSecretEncrypted: appSecret ? encryptSecret(appSecret) : existing?.appSecretEncrypted || null,
    webhookVerifyToken,
    status: 'verified',
    isVerified: true,
    lastVerifiedAt: new Date(),
    lastError: null,
  }

  if (existing) await existing.update(payload)
  else await CompanyWhatsAppSettings.create(payload)

  // Verifying the callback URL/token in the App dashboard does NOT itself link the WABA
  // to receive this App's events — that's a separate subscription this call makes for you.
  // Best-effort: credentials are already confirmed valid above, so a failure here shouldn't
  // block save/verify — it just means webhooks won't arrive until retried.
  try {
    await subscribeAppToWaba({ wabaId, accessToken })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[whatsapp] subscribeAppToWaba failed:', err.message || err)
  }

  return getSettings(companyId)
}

export async function regenerateVerifyToken(companyId) {
  const row = await CompanyWhatsAppSettings.findOne({ where: { companyId } })
  if (!row) throw httpError(404, 'NOT_FOUND', 'WhatsApp is not configured for this company yet')
  await row.update({ webhookVerifyToken: generateVerifyToken() })
  return getSettings(companyId)
}
