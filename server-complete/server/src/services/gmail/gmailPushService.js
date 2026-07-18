import { Op } from 'sequelize'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import { CompanyGoogleToken, Lead, LeadEmail } from '../../models/index.js'
import { getGoogleOAuthClient } from '../google/googleEnv.js'
import { parseGmailMessage } from './gmailMessageParse.js'
import { notifyLeadEmailReply } from '../notification/teamNotificationService.js'

function normalizeEmail(value) {
  const str = String(value || '').trim().toLowerCase()
  if (!str) return ''
  const m = str.match(/<(.+?)>/)
  return (m ? m[1] : str).trim()
}

function pubsubTopicConfigured() {
  return Boolean(String(process.env.GMAIL_PUBSUB_TOPIC || '').trim())
}

export function isGmailPushConfigured() {
  return pubsubTopicConfigured()
}

export function bindGmailForTokenRow(tokenRow) {
  const oauth2Client = getGoogleOAuthClient()
  oauth2Client.setCredentials({
    access_token: tokenRow.accessToken || undefined,
    refresh_token: tokenRow.refreshToken || undefined,
    expiry_date: tokenRow.expiryDate || undefined,
  })
  oauth2Client.on('tokens', async (tokens) => {
    await tokenRow.update({
      accessToken: tokens.access_token || tokenRow.accessToken,
      refreshToken: tokens.refresh_token || tokenRow.refreshToken,
      expiryDate: tokens.expiry_date || tokenRow.expiryDate,
      scope: tokens.scope || tokenRow.scope,
      tokenType: tokens.token_type || tokenRow.tokenType,
    })
  })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  return { gmail, oauth2Client }
}

/**
 * Register Gmail users.watch → Pub/Sub topic (env GMAIL_PUBSUB_TOPIC).
 * Stores baseline historyId + watch expiration on the token row.
 */
export async function registerGmailWatchForTokenRow(tokenRow) {
  const topicName = String(process.env.GMAIL_PUBSUB_TOPIC || '').trim()
  if (!topicName || !tokenRow?.refreshToken) {
    return { ok: false, reason: topicName ? 'NO_REFRESH' : 'NO_PUBSUB_TOPIC' }
  }
  try {
    const { gmail } = bindGmailForTokenRow(tokenRow)
    const watchResp = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds: ['INBOX', 'SENT'],
        labelFilterBehavior: 'INCLUDE',
      },
    })
    const historyId = watchResp.data.historyId != null ? String(watchResp.data.historyId) : null
    const expiration = watchResp.data.expiration != null ? Number(watchResp.data.expiration) : null
    await tokenRow.update({
      gmailHistoryId: historyId || tokenRow.gmailHistoryId,
      gmailWatchExpiresAt: expiration,
      gmailPubsubTopic: topicName,
    })
    return { ok: true, historyId, expiration }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[gmail-watch] register failed', e?.message || e)
    return { ok: false, error: String(e?.message || e) }
  }
}

async function verifyPubSubOidcIfConfigured(req) {
  if (String(process.env.GMAIL_PUBSUB_VERIFY_JWT || 'true').toLowerCase() === 'false') return
  const audience = String(process.env.GMAIL_PUBSUB_PUSH_AUDIENCE || '').trim()
  if (!audience) {
    const err = new Error('GMAIL_PUBSUB_PUSH_AUDIENCE is required when GMAIL_PUBSUB_VERIFY_JWT is not false')
    err.status = 500
    throw err
  }
  const authHeader = req.get('Authorization') || ''
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) {
    const err = new Error('Missing Authorization bearer')
    err.status = 401
    throw err
  }
  const client = new OAuth2Client()
  await client.verifyIdToken({ idToken: m[1], audience })
}

/**
 * Apply Gmail history delta for one mailbox after a Pub/Sub notification.
 * Uses users.history.list (messageAdded) then fetches only new message IDs.
 */
export async function ingestGmailHistoryFromPush(tokenRow, notificationHistoryId) {
  if (!tokenRow?.refreshToken) return { created: 0, skipped: true }
  if (!pubsubTopicConfigured()) return { created: 0, skipped: true }

  const notifyId = notificationHistoryId != null ? String(notificationHistoryId) : ''
  if (!notifyId) return { created: 0, skipped: true }

  const mailboxEmail = normalizeEmail(tokenRow.email)
  const fresh = await CompanyGoogleToken.findByPk(tokenRow.id)
  if (!fresh) return { created: 0, skipped: true }
  const { gmail } = bindGmailForTokenRow(fresh)

  if (!fresh.gmailHistoryId) {
    await fresh.update({ gmailHistoryId: notifyId })
    return { created: 0, realigned: true }
  }

  const leads = await Lead.findAll({
    where: { companyId: fresh.companyId, isDeleted: false, email: { [Op.ne]: null } },
    attributes: ['id', 'email', 'workspaceId', 'companyId', 'assignedTo', 'contactName', 'name'],
    limit: 8000,
  })
  const leadByEmail = new Map()
  for (const l of leads) {
    const k = normalizeEmail(l.email)
    // A lead sharing the connected mailbox's own address has no counterpart to match —
    // letting it in makes every message in the mailbox look like "this lead's conversation".
    if (k && k !== mailboxEmail && !leadByEmail.has(k)) leadByEmail.set(k, l)
  }

  const messageIds = new Set()
  let pageToken
  let latestHistoryId = notifyId

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const resp = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: String(fresh.gmailHistoryId),
        historyTypes: ['messageAdded'],
        pageToken,
        maxResults: 200,
      })
      if (resp.data.historyId != null) latestHistoryId = String(resp.data.historyId)
      for (const h of resp.data.history || []) {
        for (const added of h.messagesAdded || []) {
          if (added.message?.id) messageIds.add(added.message.id)
        }
      }
      pageToken = resp.data.nextPageToken
      if (!pageToken) break
    }
  } catch (e) {
    const status = e?.response?.status || e?.code
    if (status === 404) {
      await registerGmailWatchForTokenRow(await CompanyGoogleToken.findByPk(fresh.id))
      return { created: 0, historyReset: true }
    }
    throw e
  }

  let created = 0
  for (const id of messageIds) {
    const dup = await LeadEmail.findOne({
      where: { companyId: fresh.companyId, providerMessageId: id },
    })
    if (dup) continue

    const detail = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
    const parsed = parseGmailMessage(detail.data || {})
    const fromEmail = normalizeEmail(parsed?.from?.email)
    const recipients = [...(parsed.to || []), ...(parsed.cc || [])]
      .map((x) => normalizeEmail(x?.email))
      .filter(Boolean)

    let matchedLead = null
    for (const em of [fromEmail, ...recipients]) {
      if (leadByEmail.has(em)) {
        matchedLead = leadByEmail.get(em)
        break
      }
    }
    if (!matchedLead) continue

    const leadKey = normalizeEmail(matchedLead.email)
    const hasLead = fromEmail === leadKey || recipients.includes(leadKey)
    const hasMailbox = mailboxEmail ? fromEmail === mailboxEmail || recipients.includes(mailboxEmail) : true
    if (!hasLead || !hasMailbox) continue

    const direction = mailboxEmail && fromEmail === mailboxEmail ? 'outbound' : 'inbound'

    await LeadEmail.create({
      leadId: matchedLead.id,
      workspaceId: matchedLead.workspaceId,
      companyId: matchedLead.companyId,
      createdBy: fresh.userId,
      fromEmail: parsed.from?.email || fromEmail || null,
      direction,
      status: 'sent',
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml || parsed.snippet || '',
      bodyText: parsed.bodyText || parsed.snippet || '',
      toRecipients: parsed.to.map((x) => x.email).filter(Boolean),
      ccRecipients: parsed.cc.map((x) => x.email).filter(Boolean),
      bccRecipients: [],
      attachments: parsed.attachments,
      provider: 'google',
      providerMessageId: parsed.providerMessageId,
      threadId: parsed.threadId,
      sentAt: parsed.sentAt,
    })
    created += 1

    if (direction === 'inbound' && matchedLead.assignedTo) {
      notifyLeadEmailReply({
        companyId: matchedLead.companyId,
        workspaceId: matchedLead.workspaceId,
        recipientUserId: matchedLead.assignedTo,
        leadId: matchedLead.id,
        leadName: matchedLead.contactName || matchedLead.name || 'Lead',
        senderEmail: fromEmail,
      }).catch(() => {})
    }
  }

  await CompanyGoogleToken.update({ gmailHistoryId: latestHistoryId }, { where: { id: fresh.id } })

  return { created, examined: messageIds.size, latestHistoryId }
}

function decodePubSubGmailPayload(message) {
  const raw = message?.data
  if (!raw) return null
  const json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
  const emailAddress = json?.emailAddress ? String(json.emailAddress) : ''
  const historyId = json?.historyId != null ? String(json.historyId) : ''
  if (!emailAddress || !historyId) return null
  return { emailAddress, historyId }
}

/**
 * Express handler: Pub/Sub push subscription POST body.
 */
export async function handleGmailPubSubPushHttp(req, res) {
  try {
    await verifyPubSubOidcIfConfigured(req)
  } catch (e) {
    const code = e.status || 401
    return res.status(code).json({ success: false, error: e.message })
  }

  const body = req.body || {}
  const message = body.message
  const decoded = decodePubSubGmailPayload(message)
  if (!decoded) {
    return res.status(204).send()
  }

  const candidates = await CompanyGoogleToken.findAll({
    where: { refreshToken: { [Op.ne]: null } },
    order: [['updatedAt', 'DESC']],
    limit: 200,
  })
  const want = normalizeEmail(decoded.emailAddress)
  const row = candidates.find((t) => normalizeEmail(t.email) === want) || null
  if (!row) {
    return res.status(204).send()
  }

  try {
    await ingestGmailHistoryFromPush(row, decoded.historyId)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[gmail-push] ingest error', e?.message || e)
    return res.status(500).json({ success: false })
  }
  return res.status(204).send()
}

/** Renew watches that expire within ~36h (Gmail watch max 7 days). */
export async function renewDueGmailWatches() {
  if (!pubsubTopicConfigured()) return { renewed: 0 }
  const horizon = Date.now() + 36 * 60 * 60 * 1000
  const rows = await CompanyGoogleToken.findAll({
    where: {
      refreshToken: { [Op.ne]: null },
      [Op.or]: [{ gmailWatchExpiresAt: null }, { gmailWatchExpiresAt: { [Op.lt]: horizon } }],
    },
    limit: 40,
  })
  let renewed = 0
  for (const row of rows) {
    const out = await registerGmailWatchForTokenRow(row)
    if (out.ok) renewed += 1
  }
  return { renewed, scanned: rows.length }
}
