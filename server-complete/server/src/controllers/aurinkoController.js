/**
 * Aurinko controller — "Continue with Google" powered by Aurinko for Gmail +
 * Google Calendar. Tokens/accountId are stored per user in aurinko_accounts.
 */
import { AurinkoAccount, AurinkoCalendarEvent } from '../models/index.js'
import {
  buildAurinkoAuthUrl,
  exchangeAurinkoCode,
  getAurinkoAccount,
  listAurinkoCalendars,
  listAurinkoCalendarEvents,
  deleteAurinkoSubscription,
  isAurinkoAuthError,
} from '../services/aurinko/aurinkoClient.js'
import {
  isAurinkoConfigured,
  missingAurinkoEnvKeys,
  aurinkoOAuthReturnUrl,
} from '../services/aurinko/aurinkoEnv.js'
import {
  ensureEmailSubscription,
  ensureCalendarSubscription,
  upsertCalendarEvent,
  normalizeAurinkoEvent,
  markAccountAuthError,
  aurinkoAccountForUser,
} from '../services/aurinko/aurinkoSyncService.js'

/**
 * Aurinko scopes for Gmail (read + send) and Google Calendar (read + write).
 * Mail.ReadWrite (not just Mail.Read) so mark-as-read works from the CRM inbox.
 */
const AURINKO_SCOPES = ['Mail.ReadWrite', 'Mail.Send', 'Calendar.ReadWrite']

const STATE_TTL_MS = 15 * 60 * 1000

function sanitizeReturnTo(raw) {
  const val = String(raw || '').trim()
  if (!val.startsWith('/') || val.startsWith('//')) return null
  return val.slice(0, 300)
}

function encodeState({ companyId, userId, returnTo }) {
  return Buffer.from(
    JSON.stringify({ companyId, userId, t: Date.now(), ...(returnTo ? { returnTo } : {}) }),
    'utf8',
  ).toString('base64url')
}

function decodeState(rawState) {
  try {
    const state = JSON.parse(Buffer.from(String(rawState || ''), 'base64url').toString('utf8'))
    if (!state?.companyId || !state?.userId) return null
    if (!state.t || Date.now() - Number(state.t) > STATE_TTL_MS) return null
    if (state.returnTo) state.returnTo = sanitizeReturnTo(state.returnTo)
    return state
  } catch {
    return null
  }
}

function clientRedirect(returnTo, params) {
  const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
  const path = returnTo || '/integrations'
  const qs = new URLSearchParams(params).toString()
  return `${clientOrigin}${path}${qs ? `?${qs}` : ''}`
}

/* ------------------------------------------------------------------ */
/* OAuth                                                               */
/* ------------------------------------------------------------------ */

/** GET /aurinko/connect-url (auth) */
export async function getConnectUrl(req, res, next) {
  try {
    if (!isAurinkoConfigured()) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'AURINKO_NOT_CONFIGURED',
          message: `Aurinko is not configured. Missing env: ${missingAurinkoEnvKeys().join(', ')}`,
        },
      })
    }
    const state = encodeState({
      companyId: req.user.companyId,
      userId: req.user.id,
      returnTo: sanitizeReturnTo(req.query.returnTo),
    })
    const url = buildAurinkoAuthUrl({
      serviceType: 'Google',
      scopes: AURINKO_SCOPES,
      returnUrl: aurinkoOAuthReturnUrl(),
      state,
    })
    return res.json({ success: true, data: { url }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/**
 * GET /aurinko/callback (public — browser redirect from Aurinko).
 * Exchanges code -> { accountId, accessToken }, stores/updates the per-user
 * account row, then subscribes to new-mail events. No historical backfill:
 * `connectedFrom` = first connection moment and is preserved on reconnect.
 */
export async function oauthCallback(req, res, next) {
  try {
    const status = String(req.query.status || '')
    const state = decodeState(req.query.state)
    if (!state) {
      return res.redirect(302, clientRedirect('/integrations', { aurinkoError: 'invalid_state' }))
    }
    if (status && status !== 'success') {
      return res.redirect(302, clientRedirect(state.returnTo, { aurinkoError: status }))
    }
    const code = String(req.query.code || '')
    if (!code) {
      return res.redirect(302, clientRedirect(state.returnTo, { aurinkoError: 'missing_code' }))
    }

    const tokenResp = await exchangeAurinkoCode(code)
    const aurinkoAccountId = tokenResp?.accountId != null ? String(tokenResp.accountId) : null
    const accessToken = tokenResp?.accessToken || null
    if (!aurinkoAccountId || !accessToken) {
      return res.redirect(302, clientRedirect(state.returnTo, { aurinkoError: 'token_exchange_failed' }))
    }

    let email = null
    let name = null
    let scopes = null
    let serviceType = 'Google'
    try {
      const info = await getAurinkoAccount(accessToken)
      email = info?.email || info?.loginString || null
      name = info?.name || null
      scopes = Array.isArray(info?.authScopes) ? info.authScopes.join(' ') : info?.authScopes || null
      serviceType = info?.serviceType || 'Google'
    } catch {
      /* account info is best-effort; token already proven valid */
    }

    const existing = await AurinkoAccount.findOne({
      where: { companyId: state.companyId, userId: state.userId },
    })
    let accountRow
    if (existing) {
      await existing.update({
        aurinkoAccountId,
        accessToken,
        serviceType,
        email: email || existing.email,
        name: name || existing.name,
        scopes: scopes || existing.scopes,
        status: 'active',
        lastError: null,
        // connectedFrom intentionally preserved — reconnect never re-opens history.
      })
      accountRow = existing
    } else {
      accountRow = await AurinkoAccount.create({
        companyId: state.companyId,
        userId: state.userId,
        aurinkoAccountId,
        accessToken,
        serviceType,
        email,
        name,
        scopes,
        status: 'active',
        connectedFrom: new Date(),
      })
    }

    // Step 1 of the email plan: subscribe to new-mail events only. Do NOT
    // backfill old inbox history. Await so the Integrations page can reflect
    // subscription state immediately after the redirect.
    await ensureEmailSubscription(accountRow)

    return res.redirect(
      302,
      clientRedirect(state.returnTo, { connected: '1', provider: 'aurinko' }),
    )
  } catch (e) {
    return next(e)
  }
}

/* ------------------------------------------------------------------ */
/* Status / disconnect                                                 */
/* ------------------------------------------------------------------ */

/** GET /aurinko/status */
export async function getStatus(req, res, next) {
  try {
    const configured = isAurinkoConfigured()
    const accountRow = await AurinkoAccount.findOne({
      where: { companyId: req.user.companyId, userId: req.user.id },
    })
    const companyRow = accountRow || (await aurinkoAccountForUser(req.user.companyId, req.user.id))
    const row = companyRow
    return res.json({
      success: true,
      data: {
        configured,
        missingEnv: configured ? [] : missingAurinkoEnvKeys(),
        connected: Boolean(row && row.status === 'active'),
        status: row?.status || null,
        ownAccount: Boolean(accountRow),
        email: row?.email || null,
        accountId: row?.aurinkoAccountId || null,
        serviceType: row?.serviceType || null,
        connectedAt: row?.connectedFrom || null,
        emailSubscription: Boolean(row?.emailSubscriptionId),
        calendarSubscription: Boolean(row?.calendarSubscriptionId),
        calendarId: row?.calendarId || null,
        lastWebhookAt: row?.lastWebhookAt || null,
        lastError: row?.lastError || null,
      },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

/** POST /aurinko/disconnect */
export async function disconnect(req, res, next) {
  try {
    const row = await AurinkoAccount.findOne({
      where: { companyId: req.user.companyId, userId: req.user.id },
    })
    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No Aurinko account connected for this user' },
      })
    }
    for (const subId of [row.emailSubscriptionId, row.calendarSubscriptionId]) {
      if (!subId) continue
      try {
        await deleteAurinkoSubscription(row.accessToken, subId)
      } catch {
        /* subscription may already be gone */
      }
    }
    await row.update({
      status: 'disconnected',
      emailSubscriptionId: null,
      calendarSubscriptionId: null,
    })
    return res.json({ success: true, data: { disconnected: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

/* ------------------------------------------------------------------ */
/* Calendar (Section 3 — direct pulls, optional subscription)          */
/* ------------------------------------------------------------------ */

function requireAurinkoAccount(row, res) {
  if (!row) {
    res.status(400).json({
      success: false,
      error: { code: 'AURINKO_NOT_CONNECTED', message: 'Connect Google via Aurinko first.' },
    })
    return false
  }
  return true
}

/** GET /aurinko/calendars — live list of the user's calendars. */
export async function listCalendars(req, res, next) {
  try {
    const row = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (!requireAurinkoAccount(row, res)) return undefined
    const resp = await listAurinkoCalendars(row.accessToken)
    const records = Array.isArray(resp?.records) ? resp.records : Array.isArray(resp) ? resp : []
    const calendars = records.map((c) => ({
      id: String(c.id),
      name: c.name || c.summary || String(c.id),
      primary: Boolean(c.primary || String(c.id) === 'primary'),
      readOnly: Boolean(c.readOnly),
      color: c.color || null,
    }))
    return res.json({ success: true, data: calendars, meta: {} })
  } catch (e) {
    if (isAurinkoAuthError(e)) {
      const row = await aurinkoAccountForUser(req.user.companyId, req.user.id)
      if (row) await markAccountAuthError(row, e)
      return res.status(401).json({
        success: false,
        error: { code: 'AURINKO_TOKEN_INVALID', message: 'Google connection expired. Please reconnect.' },
      })
    }
    return next(e)
  }
}

/**
 * GET /aurinko/calendars/:calendarId/events?from&to
 * Events are lightweight, so they're pulled directly (no metadata-first
 * restriction). Each live read also upserts the cache; on Aurinko failure the
 * cache serves as fallback so the calendar UI stays usable.
 */
export async function listCalendarEvents(req, res, next) {
  try {
    const row = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (!requireAurinkoAccount(row, res)) return undefined
    const calendarId = String(req.params.calendarId || 'primary')
    const now = Date.now()
    const from = req.query.from ? new Date(req.query.from) : new Date(now - 7 * 86400000)
    const to = req.query.to ? new Date(req.query.to) : new Date(now + 45 * 86400000)

    try {
      const resp = await listAurinkoCalendarEvents(row.accessToken, calendarId, {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        limit: 250,
      })
      const records = Array.isArray(resp?.records) ? resp.records : []
      const events = []
      for (const record of records) {
        const norm = normalizeAurinkoEvent(record, calendarId)
        events.push({ ...norm, raw: undefined })
        // Cheap cache upsert keeps the fallback + webhook table consistent.
        upsertCalendarEvent(row, record, calendarId).catch(() => {})
      }
      events.sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0))
      return res.json({ success: true, data: events, meta: { source: 'aurinko_live', calendarId } })
    } catch (liveErr) {
      if (isAurinkoAuthError(liveErr)) {
        await markAccountAuthError(row, liveErr)
        return res.status(401).json({
          success: false,
          error: { code: 'AURINKO_TOKEN_INVALID', message: 'Google connection expired. Please reconnect.' },
        })
      }
      const cached = await AurinkoCalendarEvent.findAll({
        where: { accountId: row.id, calendarId, deleted: false },
        order: [['startAt', 'ASC']],
        limit: 250,
      })
      const events = cached
        .filter((ev) => !ev.startAt || (ev.startAt >= from && ev.startAt <= to))
        .map((ev) => ({
          calendarId: ev.calendarId,
          aurinkoEventId: ev.aurinkoEventId,
          subject: ev.subject,
          description: ev.description,
          location: ev.location,
          startAt: ev.startAt,
          endAt: ev.endAt,
          allDay: ev.allDay,
          status: ev.status,
          organizerEmail: ev.organizerEmail,
          attendees: ev.attendees,
          meetingUrl: ev.meetingUrl,
        }))
      return res.json({ success: true, data: events, meta: { source: 'cache_fallback', calendarId } })
    }
  } catch (e) {
    return next(e)
  }
}

/** POST /aurinko/calendar/subscribe { calendarId? } — optional ongoing sync. */
export async function enableCalendarSync(req, res, next) {
  try {
    const row = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (!requireAurinkoAccount(row, res)) return undefined
    const calendarId = String(req.body?.calendarId || 'primary')
    const result = await ensureCalendarSubscription(row, calendarId)
    if (!result.ok) {
      return res.status(502).json({
        success: false,
        error: { code: 'AURINKO_SUBSCRIBE_FAILED', message: result.error || 'Subscription failed' },
      })
    }
    return res.json({ success: true, data: { calendarId, subscribed: true }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
