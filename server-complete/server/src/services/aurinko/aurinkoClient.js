/**
 * Thin HTTP client for the Aurinko Unified API (https://api.aurinko.io/v1).
 *
 * Auth model:
 *  - App-level calls (token exchange) use HTTP Basic with clientId:clientSecret.
 *  - Account-level calls use `Authorization: Bearer <account access token>`.
 *    Aurinko keeps the underlying Google refresh token alive itself, so the
 *    stored account token does not expire the way raw Google tokens do.
 *
 * Every method throws AurinkoApiError on non-2xx so callers can branch on
 * status (401/403 => reauth_required).
 */
import { readAurinkoEnv } from './aurinkoEnv.js'

export class AurinkoApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'AurinkoApiError'
    this.status = status
    this.body = body
  }
}

export function isAurinkoAuthError(err) {
  return err instanceof AurinkoApiError && (err.status === 401 || err.status === 403)
}

async function aurinkoFetch(path, { method = 'GET', token, basicAuth = false, query, body, rawResponse = false } = {}) {
  const { apiBase, clientId, clientSecret } = readAurinkoEnv()
  const url = new URL(`${apiBase}/v1${path}`)
  for (const [k, v] of Object.entries(query || {})) {
    if (v === undefined || v === null || v === '') continue
    url.searchParams.set(k, String(v))
  }
  const headers = {}
  if (basicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`
  } else if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(url, { method, headers, body: payload })
  if (!res.ok) {
    let detail = null
    try {
      detail = await res.text()
    } catch {
      detail = null
    }
    throw new AurinkoApiError(
      `Aurinko ${method} ${path} failed with ${res.status}${detail ? `: ${String(detail).slice(0, 400)}` : ''}`,
      res.status,
      detail,
    )
  }
  if (rawResponse) return res
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/* ------------------------------------------------------------------ */
/* OAuth                                                               */
/* ------------------------------------------------------------------ */

/**
 * Build the hosted OAuth URL. With your own Google OAuth credentials uploaded
 * in the Aurinko app settings, the consent screen shows YOUR branding
 * (white-labeled), not Aurinko's.
 */
export function buildAurinkoAuthUrl({ serviceType = 'Google', scopes, returnUrl, state }) {
  const { apiBase, clientId } = readAurinkoEnv()
  const url = new URL(`${apiBase}/v1/auth/authorize`)
  url.searchParams.set('clientId', clientId)
  url.searchParams.set('serviceType', serviceType)
  url.searchParams.set('scopes', scopes.join(' '))
  url.searchParams.set('responseType', 'code')
  url.searchParams.set('returnUrl', returnUrl)
  if (state) url.searchParams.set('state', state)
  return url.toString()
}

/** POST /v1/auth/token/{code} (Basic) -> { accountId, accessToken, ... } */
export async function exchangeAurinkoCode(code) {
  return aurinkoFetch(`/auth/token/${encodeURIComponent(code)}`, { method: 'POST', basicAuth: true })
}

/** GET /v1/account -> { id, serviceType, email, name, authScopes, ... } */
export async function getAurinkoAccount(token) {
  return aurinkoFetch('/account', { token })
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

/**
 * GET /v1/email/messages — lightweight message list (bodies are NOT included
 * in list responses). This is the metadata-only call used on webhook fire.
 */
export async function listAurinkoMessages(token, { q, pageToken, limit } = {}) {
  return aurinkoFetch('/email/messages', { token, query: { q, pageToken, limit } })
}

/**
 * GET /v1/email/messages/{id} — full message including body. Only called when
 * a user actually opens a message (lazy load), never in the webhook path.
 */
export async function getAurinkoMessage(token, messageId) {
  return aurinkoFetch(`/email/messages/${encodeURIComponent(messageId)}`, { token })
}

/** PUT /v1/email/messages/{id} — e.g. { unread: false } to mark read. */
export async function updateAurinkoMessage(token, messageId, patch) {
  return aurinkoFetch(`/email/messages/${encodeURIComponent(messageId)}`, {
    token,
    method: 'PUT',
    body: patch,
  })
}

/**
 * GET /v1/email/messages/{id}/attachments/{attachmentId} — attachment payload
 * (base64 `content`). Fetched only on explicit user download click.
 */
export async function getAurinkoAttachment(token, messageId, attachmentId) {
  return aurinkoFetch(
    `/email/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { token },
  )
}

/**
 * POST /v1/email/messages?bodyType=html&returnIds=true — send an email.
 * `message` shape: { subject, body, from?, to: [{name?, address}], cc?, bcc?,
 * threadId?, inReplyTo?, references?, attachments?: [{name, mimeType?, content(b64), inline?}] }
 */
export async function sendAurinkoMessage(token, message) {
  return aurinkoFetch('/email/messages', {
    token,
    method: 'POST',
    query: { bodyType: 'html', returnIds: 'true' },
    body: message,
  })
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

/** GET /v1/calendars -> { records: [{ id, name, ... }] } */
export async function listAurinkoCalendars(token) {
  return aurinkoFetch('/calendars', { token })
}

/** GET /v1/calendars/{id}/events */
export async function listAurinkoCalendarEvents(token, calendarId, { timeMin, timeMax, pageToken, limit } = {}) {
  return aurinkoFetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    token,
    query: { timeMin, timeMax, pageToken, limit },
  })
}

/** GET /v1/calendars/{calId}/events/{eventId} — single event (webhook follow-up fetch). */
export async function getAurinkoCalendarEvent(token, calendarId, eventId) {
  return aurinkoFetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { token },
  )
}

/* ------------------------------------------------------------------ */
/* Webhook subscriptions                                               */
/* ------------------------------------------------------------------ */

/**
 * POST /v1/subscriptions { resource, notificationUrl }.
 * Aurinko immediately POSTs `?validationToken=` to notificationUrl and expects
 * the raw token echoed back — see handleAurinkoWebhookHttp. Aurinko renews /
 * re-creates provider subscriptions itself once this succeeds.
 */
export async function createAurinkoSubscription(token, resource, notificationUrl) {
  return aurinkoFetch('/subscriptions', {
    token,
    method: 'POST',
    body: { resource, notificationUrl },
  })
}

/** DELETE /v1/subscriptions/{id} */
export async function deleteAurinkoSubscription(token, subscriptionId) {
  return aurinkoFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, { token, method: 'DELETE' })
}
