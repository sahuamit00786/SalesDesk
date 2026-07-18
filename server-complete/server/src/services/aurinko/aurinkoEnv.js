/**
 * Aurinko environment configuration.
 *
 * Required to enable the integration:
 *   AURINKO_CLIENT_ID       - from https://app.aurinko.io (your app, team 3432)
 *   AURINKO_CLIENT_SECRET   - from the same app page
 *
 * Strongly recommended:
 *   AURINKO_SIGNING_SECRET  - app dashboard "Signing secret"; enables webhook
 *                             signature verification (X-Aurinko-Signature).
 *
 * Optional:
 *   AURINKO_API_BASE        - defaults to https://api.aurinko.io
 *   PUBLIC_SERVER_URL       - public https origin of THIS server, e.g.
 *                             https://api-leadfin.upgrowventures.com
 *                             Used to build the OAuth returnUrl and the webhook
 *                             notificationUrl. Falls back to API_BASE_URL with
 *                             the /api/v1 suffix stripped.
 */

export function readAurinkoEnv() {
  const clientId = String(process.env.AURINKO_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.AURINKO_CLIENT_SECRET || '').trim()
  const signingSecret = String(process.env.AURINKO_SIGNING_SECRET || '').trim()
  const apiBase = String(process.env.AURINKO_API_BASE || 'https://api.aurinko.io').trim().replace(/\/$/, '')
  return { clientId, clientSecret, signingSecret, apiBase }
}

export function isAurinkoConfigured() {
  const { clientId, clientSecret } = readAurinkoEnv()
  return Boolean(clientId && clientSecret)
}

export function missingAurinkoEnvKeys() {
  const missing = []
  if (!process.env.AURINKO_CLIENT_ID) missing.push('AURINKO_CLIENT_ID')
  if (!process.env.AURINKO_CLIENT_SECRET) missing.push('AURINKO_CLIENT_SECRET')
  return missing
}

/** Public origin of this API server (no trailing slash, no /api/v1). */
export function publicServerOrigin() {
  const explicit = String(process.env.PUBLIC_SERVER_URL || '').trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const apiBase = String(process.env.API_BASE_URL || '').trim()
  if (apiBase) return apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  return `http://localhost:${process.env.PORT || 4000}`
}

export function aurinkoOAuthReturnUrl() {
  return `${publicServerOrigin()}/api/v1/aurinko/callback`
}

export function aurinkoWebhookUrl() {
  return `${publicServerOrigin()}/api/v1/webhooks/aurinko`
}
