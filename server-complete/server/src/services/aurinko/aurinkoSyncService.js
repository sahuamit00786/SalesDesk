/**
 * Aurinko sync service — the event-first, fetch-on-demand core.
 *
 * Flow (matches docs/AURINKO_PLAN.md):
 *   1. Connect: OAuth via Aurinko -> aurinko_accounts row (accountId + token),
 *      then subscribe to /email/messages webhooks. NO historical backfill —
 *      sync starts fresh from `connectedFrom`.
 *   2. Webhook fire: fetch METADATA ONLY via the list endpoint (no bodies) and
 *      upsert into aurinko_email_messages. This populates the inbox list.
 *   3. User opens a message: ensureFullMessage() fetches the full body once
 *      via GET /email/messages/{id}, stores it in aurinko_email_bodies, and
 *      never calls Aurinko again for that message.
 *   4. Calendar: live reads (events are lightweight) + optional webhook
 *      subscription upserting the aurinko_calendar_events cache.
 */
import crypto from 'node:crypto'
import { Op, fn, col, where as sqlWhere } from 'sequelize'
import {
  AurinkoAccount,
  AurinkoEmailMessage,
  AurinkoEmailBody,
  AurinkoCalendarEvent,
  Lead,
} from '../../models/index.js'
import {
  listAurinkoMessages,
  getAurinkoMessage,
  getAurinkoCalendarEvent,
  createAurinkoSubscription,
  isAurinkoAuthError,
} from './aurinkoClient.js'
import { readAurinkoEnv, aurinkoWebhookUrl, isAurinkoConfigured } from './aurinkoEnv.js'

const WEBHOOK_LIST_PAGE_LIMIT = 25

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[aurinko]', ...args)
}

function warn(...args) {
  // eslint-disable-next-line no-console
  console.warn('[aurinko]', ...args)
}

/* ------------------------------------------------------------------ */
/* Account lookup helpers (shared with mailbox + leads controllers)    */
/* ------------------------------------------------------------------ */

/** Latest active Aurinko account for a company (shared-mailbox UI parity). */
export async function aurinkoAccountForCompany(companyId) {
  if (!companyId) return null
  return AurinkoAccount.findOne({
    where: { companyId, status: 'active' },
    order: [['updatedAt', 'DESC']],
  })
}

/** Prefer the requesting user's own account, fall back to the company's. */
export async function aurinkoAccountForUser(companyId, userId) {
  if (!companyId) return null
  if (userId) {
    const own = await AurinkoAccount.findOne({ where: { companyId, userId, status: 'active' } })
    if (own) return own
  }
  return aurinkoAccountForCompany(companyId)
}

export async function markAccountAuthError(accountRow, err) {
  try {
    await accountRow.update({
      status: 'reauth_required',
      lastError: String(err?.message || err).slice(0, 2000),
    })
  } catch {
    /* best effort */
  }
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

function addr(entry) {
  if (!entry) return null
  if (typeof entry === 'string') return { name: '', address: entry }
  return { name: entry.name || '', address: entry.address || entry.email || '' }
}

function addrList(list) {
  return (Array.isArray(list) ? list : []).map(addr).filter((a) => a && a.address)
}

function folderFromSysLabels(sysLabels) {
  const labels = (Array.isArray(sysLabels) ? sysLabels : []).map((l) => String(l).toLowerCase())
  if (labels.includes('sent')) return 'sent'
  if (labels.includes('inbox')) return 'inbox'
  if (labels.includes('draft') || labels.includes('junk') || labels.includes('trash')) return 'other'
  return 'inbox'
}

function isUnreadFromSysLabels(sysLabels) {
  const labels = (Array.isArray(sysLabels) ? sysLabels : []).map((l) => String(l).toLowerCase())
  return labels.includes('unread')
}

/** Map an Aurinko message record (list or full) to metadata columns. */
export function normalizeAurinkoMessageMeta(record) {
  const sysLabels = record.sysLabels || record.labels || []
  const receivedAt = record.receivedAt || record.sentAt || record.createdTime || record.date || new Date().toISOString()
  const from = addr(record.from)
  return {
    aurinkoMessageId: String(record.id),
    threadId: record.threadId != null ? String(record.threadId) : null,
    internetMessageId: record.internetMessageId || null,
    folder: folderFromSysLabels(sysLabels),
    fromName: from?.name || null,
    fromEmail: from?.address || null,
    toRecipients: addrList(record.to),
    ccRecipients: addrList(record.cc),
    bccRecipients: addrList(record.bcc),
    subject: record.subject ? String(record.subject).slice(0, 512) : null,
    snippet: record.bodySnippet || record.snippet || null,
    receivedAt: new Date(receivedAt),
    hasAttachments: Boolean(record.hasAttachments),
    isRead: !isUnreadFromSysLabels(sysLabels),
    sysLabels: Array.isArray(sysLabels) ? sysLabels : null,
  }
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ------------------------------------------------------------------ */
/* Metadata ingest (Step 2 — webhook path, no bodies)                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* CRM ingest filter                                                   */
/* ------------------------------------------------------------------ */

/**
 * Find the CRM lead this message belongs to. Case-insensitive email match
 * within the account's company. Returns null when no lead matches.
 */
async function findLeadByEmails(companyId, emails) {
  const candidates = [...new Set((emails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))]
  if (!candidates.length) return null
  return Lead.findOne({
    where: {
      companyId,
      [Op.and]: [sqlWhere(fn('LOWER', col('Lead.email')), { [Op.in]: candidates })],
    },
    attributes: ['id', 'workspaceId', 'contactName', 'email'],
    order: [['createdAt', 'DESC']],
  })
}

/**
 * The counterparty whose CRM membership decides storage:
 *  - inbox → the SENDER must be a CRM lead
 *  - sent  → at least one RECIPIENT (to/cc/bcc) must be a CRM lead
 */
async function matchLeadForMessage(accountRow, meta) {
  if (meta.folder === 'sent') {
    const recipientEmails = [...meta.toRecipients, ...meta.ccRecipients, ...meta.bccRecipients].map((r) => r.address)
    return findLeadByEmails(accountRow.companyId, recipientEmails)
  }
  return findLeadByEmails(accountRow.companyId, [meta.fromEmail])
}

/**
 * Idempotent upsert keyed on (accountId, aurinkoMessageId). Returns the row,
 * or null when the message is filtered out. `record` may be a list record (no
 * body) or a full record — only metadata fields are written here regardless.
 *
 * CRM FILTER: metadata is stored ONLY when the message involves a CRM lead
 * (sender for inbox, a recipient for sent). All other mail is skipped — not
 * stored, not shown, and its body is never fetched. Pass `options.lead` (the
 * composer's lead) to skip matching on the send path.
 */
export async function upsertMessageMetadata(accountRow, record, { source = 'webhook', lead = null } = {}) {
  const meta = normalizeAurinkoMessageMeta(record)
  // Event-first guarantee: never store anything from before the connection moment.
  if (meta.receivedAt < new Date(accountRow.connectedFrom)) return null
  if (meta.folder === 'other') return null

  const matchedLead = lead || (await matchLeadForMessage(accountRow, meta))
  if (!matchedLead) return null

  const existing = await AurinkoEmailMessage.findOne({
    where: { accountId: accountRow.id, aurinkoMessageId: meta.aurinkoMessageId },
  })
  if (existing) {
    await existing.update({
      // Flags can legitimately change (read status, labels); identity fields don't.
      isRead: meta.isRead,
      sysLabels: meta.sysLabels,
      folder: meta.folder,
      hasAttachments: meta.hasAttachments || existing.hasAttachments,
      snippet: existing.snippet || meta.snippet,
      leadId: existing.leadId || matchedLead.id,
      workspaceId: existing.workspaceId || matchedLead.workspaceId || null,
    })
    return existing
  }
  try {
    return await AurinkoEmailMessage.create({
      ...meta,
      accountId: accountRow.id,
      companyId: accountRow.companyId,
      userId: accountRow.userId,
      leadId: matchedLead.id,
      workspaceId: matchedLead.workspaceId || null,
      source,
    })
  } catch (e) {
    // Unique-key race between webhook retries — fetch the winner.
    if (String(e?.name || '').includes('UniqueConstraint')) {
      return AurinkoEmailMessage.findOne({
        where: { accountId: accountRow.id, aurinkoMessageId: meta.aurinkoMessageId },
      })
    }
    throw e
  }
}

/**
 * Webhook fired for /email/messages. Strategy:
 *  - Pull one page of the LIST endpoint (metadata only, newest first) and
 *    upsert everything new — covers the notified ids in the common case with
 *    a single lightweight call. Messages whose counterparty is NOT a CRM lead
 *    are dropped here (no row, no body fetch — see upsertMessageMetadata).
 *  - Reconcile: for any notified 'created' id still missing (e.g. burst of
 *    mail beyond one page), fetch that single message and store metadata only
 *    (body discarded, not persisted).
 *  - 'updated' ids we already track get their flags refreshed via the list
 *    match; untracked 'updated'/'deleted' ids from before connection are ignored.
 */
export async function processEmailNotification(accountRow, payloads) {
  const token = accountRow.accessToken
  const created = []
  const wanted = new Map()
  for (const p of Array.isArray(payloads) ? payloads : []) {
    if (!p?.id) continue
    wanted.set(String(p.id), String(p.changeType || 'created'))
  }

  if (wanted.size === 0) return { created: 0 }

  // Deletions first — no fetch needed.
  const deletedIds = [...wanted.entries()].filter(([, t]) => t === 'deleted').map(([id]) => id)
  if (deletedIds.length) {
    await AurinkoEmailMessage.update(
      { isDeleted: true },
      { where: { accountId: accountRow.id, aurinkoMessageId: { [Op.in]: deletedIds } } },
    )
    for (const id of deletedIds) wanted.delete(id)
  }
  if (wanted.size === 0) return { created: 0 }

  let listRecords = []
  try {
    const listResp = await listAurinkoMessages(token, { limit: WEBHOOK_LIST_PAGE_LIMIT })
    listRecords = Array.isArray(listResp?.records) ? listResp.records : []
  } catch (e) {
    if (isAurinkoAuthError(e)) {
      await markAccountAuthError(accountRow, e)
      return { created: 0, authError: true }
    }
    warn('list messages failed on webhook', e?.message || e)
  }

  for (const record of listRecords) {
    const id = String(record.id)
    if (!wanted.has(id)) continue
    const row = await upsertMessageMetadata(accountRow, record, { source: 'webhook' })
    if (row) created.push(row)
    wanted.delete(id)
  }

  // Reconciliation fallback for ids the first page missed.
  for (const [id, changeType] of wanted) {
    if (changeType !== 'created') continue // updates to untracked/pre-connection mail: ignore
    try {
      const record = await getAurinkoMessage(token, id)
      if (record) {
        const row = await upsertMessageMetadata(accountRow, record, { source: 'webhook' })
        if (row) created.push(row)
      }
    } catch (e) {
      if (isAurinkoAuthError(e)) {
        await markAccountAuthError(accountRow, e)
        return { created: created.length, authError: true }
      }
      warn(`reconcile fetch failed for message ${id}`, e?.message || e)
    }
  }

  await accountRow.update({ lastWebhookAt: new Date() }).catch(() => {})
  return { created: created.length }
}

/* ------------------------------------------------------------------ */
/* Lazy full-content fetch (Step 3 — on user open only)                */
/* ------------------------------------------------------------------ */

/**
 * Returns { metaRow, bodyRow }. Fetches from Aurinko only if no body row
 * exists yet; afterwards, reopening reads purely from the DB.
 */
export async function ensureFullMessage(accountRow, metaRow) {
  let bodyRow = await AurinkoEmailBody.findOne({ where: { messageId: metaRow.id } })
  if (bodyRow) return { metaRow, bodyRow }

  const record = await getAurinkoMessage(accountRow.accessToken, metaRow.aurinkoMessageId)
  const rawBody = record?.body || ''
  const bodyType = String(record?.bodyType || '').toLowerCase()
  const looksHtml = bodyType === 'html' || /<[a-z][\s\S]*>/i.test(rawBody)
  const bodyHtml = looksHtml ? rawBody : ''
  const bodyText = looksHtml ? stripHtml(rawBody) : rawBody

  const attachments = (Array.isArray(record?.attachments) ? record.attachments : [])
    .filter((a) => a && (a.id || a.attachmentId))
    .map((a) => ({
      id: String(a.id || a.attachmentId),
      name: a.name || a.filename || 'attachment',
      mimeType: a.mimeType || a.contentType || 'application/octet-stream',
      sizeBytes: Number(a.size || 0) || 0,
      inline: Boolean(a.inline),
      contentId: a.contentId || null,
    }))

  try {
    bodyRow = await AurinkoEmailBody.create({
      messageId: metaRow.id,
      bodyHtml,
      bodyText,
      attachments,
      rawSizeBytes: Buffer.byteLength(rawBody || '', 'utf8'),
      fetchedAt: new Date(),
    })
  } catch (e) {
    if (String(e?.name || '').includes('UniqueConstraint')) {
      bodyRow = await AurinkoEmailBody.findOne({ where: { messageId: metaRow.id } })
    } else {
      throw e
    }
  }

  await metaRow.update({
    hasFullContent: true,
    hasAttachments: metaRow.hasAttachments || attachments.length > 0,
    snippet: metaRow.snippet || String(bodyText || '').slice(0, 255) || null,
  })
  return { metaRow, bodyRow }
}

/* ------------------------------------------------------------------ */
/* Calendar sync                                                       */
/* ------------------------------------------------------------------ */

function eventTime(part) {
  if (!part) return { at: null, allDay: false }
  if (typeof part === 'string') return { at: new Date(part), allDay: false }
  if (part.dateTime) return { at: new Date(part.dateTime), allDay: false }
  if (part.date) return { at: new Date(part.date), allDay: true }
  return { at: null, allDay: false }
}

export function normalizeAurinkoEvent(record, calendarId) {
  const start = eventTime(record.start)
  const end = eventTime(record.end)
  const organizer = addr(record.organizer)
  return {
    calendarId: String(calendarId || record.calendarId || 'primary'),
    aurinkoEventId: String(record.id),
    subject: record.subject || record.summary || null,
    description: record.description || null,
    location: typeof record.location === 'string' ? record.location : record.location?.displayName || null,
    startAt: start.at,
    endAt: end.at,
    allDay: Boolean(record.allDay ?? start.allDay),
    status: record.status || null,
    organizerEmail: organizer?.address || null,
    attendees: addrList(record.attendees).map((a, i) => ({
      ...a,
      status: record.attendees?.[i]?.status || record.attendees?.[i]?.responseStatus || null,
    })),
    meetingUrl:
      record.meetingInfo?.url ||
      record.onlineMeetingUrl ||
      record.hangoutLink ||
      null,
    raw: record,
  }
}

export async function upsertCalendarEvent(accountRow, record, calendarId) {
  const norm = normalizeAurinkoEvent(record, calendarId)
  const where = {
    accountId: accountRow.id,
    calendarId: norm.calendarId,
    aurinkoEventId: norm.aurinkoEventId,
  }
  const existing = await AurinkoCalendarEvent.findOne({ where })
  if (existing) {
    await existing.update({ ...norm, deleted: false })
    return existing
  }
  try {
    return await AurinkoCalendarEvent.create({
      ...norm,
      accountId: accountRow.id,
      companyId: accountRow.companyId,
      userId: accountRow.userId,
    })
  } catch (e) {
    if (String(e?.name || '').includes('UniqueConstraint')) {
      const row = await AurinkoCalendarEvent.findOne({ where })
      if (row) await row.update({ ...norm, deleted: false })
      return row
    }
    throw e
  }
}

/** Webhook fired for /calendars/{calId}/events. */
export async function processCalendarNotification(accountRow, resource, payloads) {
  const m = String(resource || '').match(/^\/calendars\/([^/]+)\/events$/)
  const calendarId = m ? decodeURIComponent(m[1]) : accountRow.calendarId || 'primary'
  let touched = 0
  for (const p of Array.isArray(payloads) ? payloads : []) {
    if (!p?.id) continue
    const eventId = String(p.id)
    const changeType = String(p.changeType || 'updated')
    if (changeType === 'deleted') {
      await AurinkoCalendarEvent.update(
        { deleted: true },
        { where: { accountId: accountRow.id, calendarId, aurinkoEventId: eventId } },
      )
      touched += 1
      continue
    }
    try {
      const record = await getAurinkoCalendarEvent(accountRow.accessToken, calendarId, eventId)
      if (record) {
        await upsertCalendarEvent(accountRow, record, calendarId)
        touched += 1
      }
    } catch (e) {
      if (isAurinkoAuthError(e)) {
        await markAccountAuthError(accountRow, e)
        return { touched }
      }
      warn(`calendar event fetch failed ${calendarId}/${eventId}`, e?.message || e)
    }
  }
  await accountRow.update({ lastWebhookAt: new Date() }).catch(() => {})
  return { touched }
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

/**
 * Subscribe this account to new-mail events. Aurinko validates the
 * notificationUrl synchronously (validationToken handshake), then renews and
 * re-creates the provider-side subscription itself. We keep a daily self-heal
 * pass in case the subscription was removed (e.g. a 422 from our endpoint).
 */
export async function ensureEmailSubscription(accountRow) {
  if (accountRow.emailSubscriptionId) return { ok: true, existing: true }
  try {
    const sub = await createAurinkoSubscription(
      accountRow.accessToken,
      '/email/messages',
      aurinkoWebhookUrl(),
    )
    await accountRow.update({
      emailSubscriptionId: sub?.id != null ? String(sub.id) : null,
      emailSubscriptionAt: new Date(),
      lastError: null,
    })
    log(`email subscription created for account ${accountRow.aurinkoAccountId} (${accountRow.email || 'unknown'})`)
    return { ok: true, id: sub?.id }
  } catch (e) {
    if (isAurinkoAuthError(e)) await markAccountAuthError(accountRow, e)
    else await accountRow.update({ lastError: String(e?.message || e).slice(0, 2000) }).catch(() => {})
    warn('email subscription failed', e?.message || e)
    return { ok: false, error: String(e?.message || e) }
  }
}

export async function ensureCalendarSubscription(accountRow, calendarId = 'primary') {
  if (accountRow.calendarSubscriptionId && accountRow.calendarId === calendarId) {
    return { ok: true, existing: true }
  }
  try {
    const sub = await createAurinkoSubscription(
      accountRow.accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      aurinkoWebhookUrl(),
    )
    await accountRow.update({
      calendarSubscriptionId: sub?.id != null ? String(sub.id) : null,
      calendarSubscriptionAt: new Date(),
      calendarId,
      lastError: null,
    })
    log(`calendar subscription created for account ${accountRow.aurinkoAccountId} on ${calendarId}`)
    return { ok: true, id: sub?.id }
  } catch (e) {
    if (isAurinkoAuthError(e)) await markAccountAuthError(accountRow, e)
    warn('calendar subscription failed', e?.message || e)
    return { ok: false, error: String(e?.message || e) }
  }
}

/** Daily self-heal: re-create any missing subscriptions for active accounts. */
export async function ensureAurinkoSubscriptions() {
  if (!isAurinkoConfigured()) return { checked: 0 }
  const accounts = await AurinkoAccount.findAll({ where: { status: 'active' } })
  let checked = 0
  for (const account of accounts) {
    checked += 1
    if (!account.emailSubscriptionId) await ensureEmailSubscription(account)
    if (account.calendarId && !account.calendarSubscriptionId) {
      await ensureCalendarSubscription(account, account.calendarId)
    }
  }
  return { checked }
}

/* ------------------------------------------------------------------ */
/* Webhook HTTP handler (raw body — mounted BEFORE express.json)       */
/* ------------------------------------------------------------------ */

function verifyAurinkoSignature(req, rawBody) {
  const { signingSecret } = readAurinkoEnv()
  if (!signingSecret) {
    // Explicit opt-out only: without a secret we accept but warn loudly.
    warn('AURINKO_SIGNING_SECRET not set — webhook signature NOT verified')
    return true
  }
  const timestamp = req.get('X-Aurinko-Request-Timestamp') || ''
  const signature = req.get('X-Aurinko-Signature') || ''
  if (!timestamp || !signature) return false
  const prefix = Buffer.from(`v0:${timestamp}:`, 'utf8')
  const data = Buffer.concat([prefix, rawBody || Buffer.alloc(0)])
  const computed = crypto.createHmac('sha256', signingSecret).update(data).digest('hex')
  const a = Buffer.from(computed, 'utf8')
  const b = Buffer.from(String(signature), 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * POST /api/v1/webhooks/aurinko
 * Handles (a) the subscription validation handshake and (b) event
 * notifications. Must receive the RAW body (express.raw) so the HMAC matches.
 * Responds 200 fast; event processing continues asynchronously per Aurinko's
 * guidance. Never returns 422 (that would delete the subscription).
 */
export async function handleAurinkoWebhookHttp(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ? String(req.body) : '', 'utf8')

  if (!verifyAurinkoSignature(req, rawBody)) {
    return res.status(401).send('invalid signature')
  }

  // (a) Notification URL verification handshake — echo the token as text/plain.
  const validationToken = req.query.validationToken
  if (validationToken) {
    res.set('Content-Type', 'text/plain')
    return res.status(200).send(String(validationToken))
  }

  let event = null
  try {
    event = JSON.parse(rawBody.toString('utf8') || '{}')
  } catch {
    return res.status(200).send('ok') // malformed retry payload — ack to stop retries
  }

  // Ack immediately; process async.
  res.status(200).send('ok')

  setImmediate(async () => {
    try {
      const accountId = event?.accountId != null ? String(event.accountId) : null
      if (!accountId) return
      const accountRow = await AurinkoAccount.findOne({ where: { aurinkoAccountId: accountId } })
      if (!accountRow || accountRow.status === 'disconnected') return

      if (event.lifecycleEvent) {
        if (event.lifecycleEvent === 'error') {
          await accountRow.update({
            status: 'reauth_required',
            lastError: String(event.error || 'subscription error').slice(0, 2000),
          })
        } else if (event.lifecycleEvent === 'active') {
          await accountRow.update({ status: 'active', lastError: null })
        }
        return
      }

      const resource = String(event.resource || '')
      if (resource === '/email/messages') {
        await processEmailNotification(accountRow, event.payloads)
      } else if (/^\/calendars\/[^/]+\/events$/.test(resource)) {
        await processCalendarNotification(accountRow, resource, event.payloads)
      }
    } catch (e) {
      warn('webhook processing failed', e?.message || e)
    }
  })
  return undefined
}
