import { google } from 'googleapis'

/**
 * Read Google OAuth vars from process.env with trim + strip one pair of surrounding quotes.
 * Tries alternate key names people often copy from different Google / blog examples.
 */
function trimEnv(key) {
  const raw = process.env[key]
  if (typeof raw !== 'string') return ''
  let v = raw.trim().replace(/^\uFEFF/, '')
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim()
  }
  return v
}

function firstTruthy(...keys) {
  for (const key of keys) {
    const v = trimEnv(key)
    if (v) return v
  }
  return ''
}

export function readGoogleOAuthEnv() {
  // Precedence MUST match the Integrations connect flow (emailOAuthClient in
  // leadsController.js), which mints CompanyGoogleToken refresh tokens under
  // GOOGLE_OAUTH_CLIENT_ID. Refreshing a token with a different client_id than
  // it was issued under returns `unauthorized_client`, so prefer GOOGLE_OAUTH_*.
  return {
    clientId: firstTruthy('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENT_ID'),
    clientSecret: firstTruthy(
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'GOOGLE_CLIENT_SECRET',
    ),
    redirectUri: firstTruthy(
      'GOOGLE_OAUTH_REDIRECT_URI',
      'GOOGLE_REDIRECT_URI',
      'GOOGLE_CALLBACK_URL',
    ),
    refreshToken: firstTruthy(
      'GOOGLE_REFRESH_TOKEN',
      'GOOGLE_OAUTH_REFRESH_TOKEN',
      'GOOGLE_CALENDAR_REFRESH_TOKEN',
    ),
  }
}

export function missingGoogleOAuthEnvKeys() {
  const e = readGoogleOAuthEnv()
  const missing = []
  if (!e.clientId) missing.push('GOOGLE_CLIENT_ID')
  if (!e.clientSecret) missing.push('GOOGLE_CLIENT_SECRET')
  if (!e.redirectUri) missing.push('GOOGLE_REDIRECT_URI')
  if (!e.refreshToken) missing.push('GOOGLE_REFRESH_TOKEN')
  return missing
}

export function isGoogleCalendarConfigured() {
  return missingGoogleOAuthEnvKeys().length === 0
}

export function getGoogleOAuthClient() {
  const e = readGoogleOAuthEnv()
  if (!e.clientId || !e.clientSecret || !e.redirectUri) {
    const err = new Error('Google OAuth is not configured')
    err.status = 500
    err.code = 'GOOGLE_OAUTH_NOT_CONFIGURED'
    throw err
  }
  return new google.auth.OAuth2(e.clientId, e.clientSecret, e.redirectUri)
}
