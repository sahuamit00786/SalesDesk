import Joi from 'joi'
import { Op } from 'sequelize'
import {
  CompanyGoogleToken,
  Lead,
  AurinkoEmailMessage,
  AurinkoEmailBody,
} from '../models/index.js'
import { bindGmailForTokenRow } from '../services/gmail/gmailPushService.js'
import { parseAddressList, parseHeader } from '../services/gmail/gmailMessageParse.js'
import { gmailParserService } from '../services/gmailParserService.js'
import { createDocumentWithLinks } from '../services/documentsService.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'
import {
  aurinkoAccountForUser,
  ensureFullMessage,
  markAccountAuthError,
} from '../services/aurinko/aurinkoSyncService.js'
import {
  updateAurinkoMessage,
  getAurinkoAttachment,
  isAurinkoAuthError,
} from '../services/aurinko/aurinkoClient.js'
import { leadAccessWhere } from '../services/leadVisibility.js'

async function companyMailboxToken(companyId) {
  return CompanyGoogleToken.findOne({
    where: { companyId },
    order: [['updatedAt', 'DESC']],
  })
}

/* ================================================================== */
/* Aurinko-backed mailbox (event-first, fetch-on-demand)               */
/*                                                                    */
/* When the company has an active Aurinko account, every mailbox      */
/* endpoint below serves from the local metadata/body tables instead  */
/* of calling Gmail live. The response shapes are IDENTICAL to the    */
/* legacy Gmail-backed responses so the existing EmailPage UI works   */
/* unchanged, except thread detail which returns a pre-normalized     */
/* payload flagged with meta.source = 'aurinko'.                      */
/* ================================================================== */

function fmtIN(date) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initialsOf(nameOrEmail) {
  return (
    String(nameOrEmail || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '??'
  )
}

function decodeOffsetToken(pageToken) {
  if (!pageToken) return 0
  const n = Number(Buffer.from(String(pageToken), 'base64url').toString('utf8'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function encodeOffsetToken(offset) {
  return Buffer.from(String(offset), 'utf8').toString('base64url')
}

/**
 * Per-user visibility for the Aurinko mailbox. Every stored message belongs
 * to a CRM lead (ingest filter guarantees it); a user sees a message only if
 * they can see that lead:
 *  - workspace access via allowedWorkspaceIdsForUser
 *  - role scoping via leadAccessWhere (admins/managers: workspace-wide;
 *    sales/custom: only leads they own or are assigned to)
 */
async function aurinkoLeadVisibilityInclude(req) {
  const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
  const accessWhere = await leadAccessWhere(req.user)
  return {
    model: Lead,
    as: 'lead',
    required: true,
    attributes: ['id', 'contactName', 'email', 'workspaceId'],
    where: {
      ...accessWhere,
      workspaceId: { [Op.in]: workspaceIds.length ? workspaceIds : ['__none__'] },
    },
  }
}

function threadKeyOf(row) {
  return row.threadId || `single:${row.aurinkoMessageId}`
}

/** Group metadata rows (newest first) into thread summaries. */
function groupAurinkoThreads(rows) {
  const map = new Map()
  for (const row of rows) {
    const key = threadKeyOf(row)
    if (!map.has(key)) {
      map.set(key, { key, rows: [] })
    }
    map.get(key).rows.push(row)
  }
  return [...map.values()]
}

function aurinkoThreadSummary(group) {
  const rows = [...group.rows].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
  const last = rows[0]
  const fromName = last.fromName || last.fromEmail || 'Unknown'
  const leadRow = rows.map((r) => r.lead).find(Boolean) || null
  return {
    threadId: group.key,
    subject: last.subject || '(No subject)',
    snippet: last.snippet || '',
    lastMessageAt: new Date(last.receivedAt).toISOString(),
    lastDateFormatted: fmtIN(last.receivedAt),
    messageCount: rows.length,
    hasAttachments: rows.some((r) => r.hasAttachments),
    isUnread: rows.some((r) => !r.isRead && r.folder === 'inbox'),
    lastMessage: {
      from: {
        name: fromName,
        email: last.fromEmail || '',
        initials: initialsOf(fromName),
      },
    },
    lead: leadRow
      ? { id: leadRow.id, name: leadRow.contactName || leadRow.email || '', email: leadRow.email || '' }
      : null,
  }
}

async function aurinkoThreadRows(accountRow, threadId, req) {
  const where = { accountId: accountRow.id, isDeleted: false }
  if (String(threadId).startsWith('single:')) {
    where.aurinkoMessageId = String(threadId).replace('single:', '')
  } else {
    where.threadId = String(threadId)
  }
  return AurinkoEmailMessage.findAll({
    where,
    include: [await aurinkoLeadVisibilityInclude(req)],
    order: [['receivedAt', 'ASC']],
  })
}

async function getMailboxInboxBadgeAurinko(accountRow, req, res) {
  const unread = await AurinkoEmailMessage.count({
    where: { accountId: accountRow.id, folder: 'inbox', isRead: false, isDeleted: false },
    include: [await aurinkoLeadVisibilityInclude(req)],
    distinct: true,
    col: 'id',
  })
  return res.json({
    success: true,
    data: { unread, connected: true, unreadApproximate: false },
    meta: {},
  })
}

async function listMailboxThreadsAurinko(accountRow, req, res) {
  const box = String(req.query.box || 'inbox').toLowerCase() === 'sent' ? 'sent' : 'inbox'
  const search = String(req.query.search || '').trim()
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 35))
  const offset = decodeOffsetToken(String(req.query.pageToken || '').trim() || undefined)

  const where = { accountId: accountRow.id, folder: box, isDeleted: false }
  if (search) {
    const like = `%${search}%`
    where[Op.or] = [
      { subject: { [Op.like]: like } },
      { snippet: { [Op.like]: like } },
      { fromEmail: { [Op.like]: like } },
      { fromName: { [Op.like]: like } },
    ]
  }

  // Over-fetch messages so grouping still yields a full page of threads.
  const rows = await AurinkoEmailMessage.findAll({
    where,
    include: [await aurinkoLeadVisibilityInclude(req)],
    order: [['receivedAt', 'DESC']],
    limit: (offset + limit + 1) * 4,
  })
  const groups = groupAurinkoThreads(rows)
  const page = groups.slice(offset, offset + limit)
  const hasMore = groups.length > offset + limit
  const summaries = page.map(aurinkoThreadSummary)

  return res.json({
    success: true,
    data: summaries,
    meta: {
      total: summaries.length,
      nextPageToken: hasMore ? encodeOffsetToken(offset + limit) : null,
      box,
      googleEmailConnected: true,
      source: 'aurinko',
    },
  })
}

async function getMailboxThreadAurinko(accountRow, req, res) {
  const threadId = String(req.params.threadId || '')
  if (!threadId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'threadId required' } })
  }
  const rows = await aurinkoThreadRows(accountRow, threadId, req)
  if (!rows.length) {
    return res.json({ success: true, data: null, meta: { source: 'aurinko' } })
  }

  const messages = []
  for (const metaRow of rows) {
    // Step 3 — full body + attachment metadata fetched ONLY here, on open,
    // and stored so reopening later never re-calls Aurinko.
    let bodyRow = null
    try {
      ;({ bodyRow } = await ensureFullMessage(accountRow, metaRow))
    } catch (e) {
      if (isAurinkoAuthError(e)) {
        await markAccountAuthError(accountRow, e)
        return res.status(401).json({
          success: false,
          error: { code: 'AURINKO_TOKEN_INVALID', message: 'Google connection expired. Please reconnect.' },
        })
      }
      // Serve metadata-only if the body fetch transiently fails.
      bodyRow = await AurinkoEmailBody.findOne({ where: { messageId: metaRow.id } })
    }
    messages.push({
      id: metaRow.aurinkoMessageId,
      threadId,
      subject: metaRow.subject || '(No subject)',
      from: { name: metaRow.fromName || '', email: metaRow.fromEmail || '' },
      to: metaRow.toRecipients || [],
      cc: metaRow.ccRecipients || [],
      date: new Date(metaRow.receivedAt).toISOString(),
      bodyHtml: bodyRow?.bodyHtml || '',
      bodyText: bodyRow?.bodyText || '',
      snippet: metaRow.snippet || '',
      attachments: bodyRow?.attachments || [],
      isUnread: !metaRow.isRead,
      folder: metaRow.folder,
    })
  }

  return res.json({
    success: true,
    data: { id: threadId, messages },
    meta: { source: 'aurinko' },
  })
}

async function markMailboxThreadReadAurinko(accountRow, req, res) {
  const threadId = String(req.params.threadId || '')
  if (!threadId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'threadId required' } })
  }
  const rows = await aurinkoThreadRows(accountRow, threadId, req)
  for (const row of rows) {
    if (row.isRead) continue
    try {
      await updateAurinkoMessage(accountRow.accessToken, row.aurinkoMessageId, { unread: false })
    } catch (e) {
      if (isAurinkoAuthError(e)) await markAccountAuthError(accountRow, e)
      // Local state still flips so the UI is consistent; provider will
      // reconcile via the next webhook if the remote update failed.
    }
    await row.update({ isRead: true })
  }
  return res.json({ success: true, data: { threadId }, meta: { source: 'aurinko' } })
}

/** The metadata row for an aurinko message id, only if visible to this user. */
async function aurinkoAccessibleMessage(accountRow, aurinkoMessageId, req) {
  return AurinkoEmailMessage.findOne({
    where: { accountId: accountRow.id, aurinkoMessageId: String(aurinkoMessageId), isDeleted: false },
    include: [await aurinkoLeadVisibilityInclude(req)],
  })
}

async function fetchAurinkoAttachmentBuffer(accountRow, aurinkoMessageId, attachmentId) {
  const att = await getAurinkoAttachment(accountRow.accessToken, aurinkoMessageId, attachmentId)
  const b64 = att?.content || att?.data || ''
  return {
    buffer: Buffer.from(String(b64), 'base64'),
    mimeType: att?.mimeType || att?.contentType || null,
    name: att?.name || att?.filename || null,
  }
}

function gmailAfterQueryFromDate(d) {
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return '2000/01/01'
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

function guessFileTypeFromName(name) {
  const ext = String(name || '').split('.').pop()?.toLowerCase()
  const map = {
    pdf: 'Contract',
    doc: 'Contract',
    docx: 'Contract',
    xls: 'Proposal',
    xlsx: 'Proposal',
    csv: 'Proposal',
    ppt: 'Presentation',
    pptx: 'Presentation',
    png: 'Image',
    jpg: 'Image',
    jpeg: 'Image',
    gif: 'Image',
    webp: 'Image',
  }
  return map[ext] || 'Other'
}

function guessMimeFromName(name) {
  const ext = String(name || '').split('.').pop()?.toLowerCase()
  const map = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    html: 'text/html',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
  }
  return map[ext] || 'application/octet-stream'
}

export async function getMailboxInboxBadge(req, res, next) {
  try {
    const aurinkoAccount = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (aurinkoAccount) return await getMailboxInboxBadgeAurinko(aurinkoAccount, req, res)
    const tokenRow = await companyMailboxToken(req.user.companyId)
    if (!tokenRow?.refreshToken) {
      return res.json({ success: true, data: { unread: 0, connected: false, unreadApproximate: false }, meta: {} })
    }
    const { gmail } = bindGmailForTokenRow(tokenRow)
    /** Match listMailboxThreads: only inbox mail since Google was connected (not whole Gmail history). */
    const qParts = [`after:${gmailAfterQueryFromDate(tokenRow.createdAt || tokenRow.updatedAt)}`, 'in:inbox', 'is:unread']
    const q = qParts.join(' ')
    const maxResults = 100
    const listResp = await gmail.users.threads.list({ userId: 'me', q, maxResults })
    const threads = listResp.data.threads || []
    const hasMore = Boolean(listResp.data.nextPageToken)
    const unread = threads.length
    return res.json({
      success: true,
      data: { unread, connected: true, unreadApproximate: hasMore },
      meta: {},
    })
  } catch (e) {
    return next(e)
  }
}

export async function listMailboxThreads(req, res, next) {
  try {
    const aurinkoAccount = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (aurinkoAccount) return await listMailboxThreadsAurinko(aurinkoAccount, req, res)
    const tokenRow = await companyMailboxToken(req.user.companyId)
    if (!tokenRow?.refreshToken) {
      return res.json({ success: true, data: [], meta: { total: 0, googleEmailConnected: false } })
    }
    const box = String(req.query.box || 'inbox').toLowerCase() === 'sent' ? 'sent' : 'inbox'
    const search = String(req.query.search || '').trim()
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 35))
    const pageToken = String(req.query.pageToken || '').trim() || undefined

    const qParts = [`after:${gmailAfterQueryFromDate(tokenRow.createdAt || tokenRow.updatedAt)}`]
    qParts.push(box === 'sent' ? 'in:sent' : 'in:inbox')
    if (search) qParts.push(search)
    const q = qParts.join(' ')

    const { gmail } = bindGmailForTokenRow(tokenRow)
    const listResp = await gmail.users.threads.list({
      userId: 'me',
      q,
      maxResults: limit,
      pageToken,
    })
    const threads = listResp.data.threads || []
    const nextPageToken = listResp.data.nextPageToken || null

    const summaries = await Promise.all(
      threads.map(async (t) => {
        try {
          const meta = await gmail.users.threads.get({
            userId: 'me',
            id: t.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          })
          const msgs = meta.data.messages || []
          const last = msgs[msgs.length - 1] || msgs[0]
          const headers = last?.payload?.headers || []
          const subject = parseHeader(headers, 'Subject') || meta.data.snippet || '(No subject)'
          const fromRaw = parseHeader(headers, 'From')
          const fromParsed = parseAddressList(fromRaw)[0] || { name: 'Unknown', email: '' }
          const internalMs = last?.internalDate ? Number(last.internalDate) : Date.now()
          const lastAt = new Date(internalMs)
          const labelIds = last?.labelIds || []
          const isUnread = labelIds.includes('UNREAD')
          let hasAttachments = false
          for (const m of msgs) {
            if (m?.payload?.mimeType === 'multipart/mixed' || (m?.payload?.parts || []).some((p) => p.filename)) {
              hasAttachments = true
              break
            }
          }
          return {
            threadId: t.id,
            subject,
            snippet: meta.data.snippet || '',
            lastMessageAt: lastAt.toISOString(),
            lastDateFormatted: lastAt.toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            messageCount: msgs.length,
            hasAttachments,
            isUnread,
            lastMessage: {
              from: {
                name: fromParsed.name || fromParsed.email || 'Unknown',
                email: fromParsed.email || '',
                initials: String(fromParsed.name || fromParsed.email || '?')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join('') || '??',
              },
            },
            lead: null,
          }
        } catch {
          return {
            threadId: t.id,
            subject: t.snippet?.slice(0, 120) || '(No subject)',
            snippet: t.snippet || '',
            lastMessageAt: new Date().toISOString(),
            lastDateFormatted: '',
            messageCount: 0,
            hasAttachments: false,
            isUnread: false,
            lastMessage: {
              from: { name: '—', email: '', initials: '?' },
            },
            lead: null,
          }
        }
      }),
    )

    return res.json({
      success: true,
      data: summaries,
      meta: { total: summaries.length, nextPageToken, box, googleEmailConnected: true },
    })
  } catch (e) {
    return next(e)
  }
}

export async function getMailboxThread(req, res, next) {
  try {
    const aurinkoAccount = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (aurinkoAccount) return await getMailboxThreadAurinko(aurinkoAccount, req, res)
    const tokenRow = await companyMailboxToken(req.user.companyId)
    if (!tokenRow?.refreshToken) {
      return res.json({ success: true, data: null, meta: { googleEmailConnected: false } })
    }
    const threadId = String(req.params.threadId || '')
    if (!threadId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'threadId required' } })
    }
    const { gmail } = bindGmailForTokenRow(tokenRow)
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' })
    return res.json({ success: true, data: thread.data, meta: { source: 'gmail_api' } })
  } catch (e) {
    return next(e)
  }
}

/** Remove UNREAD from all messages in the thread (same as opening in Gmail). */
export async function markMailboxThreadRead(req, res, next) {
  try {
    const aurinkoAccount = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (aurinkoAccount) return await markMailboxThreadReadAurinko(aurinkoAccount, req, res)
    const tokenRow = await companyMailboxToken(req.user.companyId)
    if (!tokenRow?.refreshToken) {
      return res.status(400).json({ success: false, error: { code: 'GOOGLE_EMAIL_NOT_CONNECTED', message: 'Connect Google' } })
    }
    const threadId = String(req.params.threadId || '')
    if (!threadId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'threadId required' } })
    }
    const { gmail } = bindGmailForTokenRow(tokenRow)
    await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: { removeLabelIds: ['UNREAD'] },
    })
    return res.json({ success: true, data: { threadId }, meta: {} })
  } catch (e) {
    return next(e)
  }
}

export async function downloadMailboxAttachment(req, res, next) {
  try {
    const messageId = String(req.params.messageId || '')
    const attachmentId = String(req.params.attachmentId || '')
    const fileName = String(req.query.fileName || 'attachment').replace(/[^\w.\- ]+/g, '_')
    if (!messageId || !attachmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Missing ids' } })
    }

    const aurinkoAccount = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    if (aurinkoAccount) {
      // Visibility gate: the message must belong to a lead this user can see.
      const metaRow = await aurinkoAccessibleMessage(aurinkoAccount, messageId, req)
      if (!metaRow) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found' } })
      }
      // Attachment binaries are never stored — proxied on genuine user click only.
      const { buffer, mimeType } = await fetchAurinkoAttachmentBuffer(aurinkoAccount, messageId, attachmentId)
      res.setHeader('Content-Type', mimeType || guessMimeFromName(fileName))
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`)
      return res.send(buffer)
    }

    const tokenRow = await companyMailboxToken(req.user.companyId)
    if (!tokenRow?.refreshToken) {
      return res.status(400).json({ success: false, error: { code: 'GOOGLE_EMAIL_NOT_CONNECTED', message: 'Connect Google' } })
    }
    const { oauth2Client } = bindGmailForTokenRow(tokenRow)
    const buffer = await gmailParserService.fetchAttachment(oauth2Client, messageId, attachmentId)
    const mime = guessMimeFromName(fileName)
    res.setHeader('Content-Type', mime)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`)
    return res.send(buffer)
  } catch (e) {
    return next(e)
  }
}

const saveAttachmentSchema = Joi.object({
  messageId: Joi.string().required(),
  attachmentId: Joi.string().required(),
  fileName: Joi.string().max(255).required(),
  leadId: Joi.string().uuid().required(),
})

export async function saveMailboxAttachmentToLead(req, res, next) {
  try {
    const { error, value } = saveAttachmentSchema.validate(req.body || {}, { abortEarly: false, stripUnknown: true })
    if (error) return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: error.message } })

    const aurinkoAccount = await aurinkoAccountForUser(req.user.companyId, req.user.id)
    const tokenRow = aurinkoAccount ? null : await companyMailboxToken(req.user.companyId)
    if (!aurinkoAccount && !tokenRow?.refreshToken) {
      return res.status(400).json({ success: false, error: { code: 'GOOGLE_EMAIL_NOT_CONNECTED', message: 'Connect Google' } })
    }

    const workspaceIds = await allowedWorkspaceIdsForUser(req.user)
    const lead = await Lead.findOne({
      where: {
        id: value.leadId,
        companyId: req.user.companyId,
        isDeleted: false,
        workspaceId: { [Op.in]: workspaceIds },
      },
    })
    if (!lead) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' } })
    }

    let buffer
    if (aurinkoAccount) {
      const metaRow = await aurinkoAccessibleMessage(aurinkoAccount, value.messageId, req)
      if (!metaRow) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found' } })
      }
      ;({ buffer } = await fetchAurinkoAttachmentBuffer(aurinkoAccount, value.messageId, value.attachmentId))
    } else {
      const { oauth2Client } = bindGmailForTokenRow(tokenRow)
      buffer = await gmailParserService.fetchAttachment(oauth2Client, value.messageId, value.attachmentId)
    }
    const safeName = String(value.fileName || 'attachment').trim() || 'attachment'
    const fileType = guessFileTypeFromName(safeName)

    const file = {
      buffer,
      originalname: safeName,
      size: buffer.length,
      mimetype: guessMimeFromName(safeName),
    }

    const row = await createDocumentWithLinks({
      file,
      name: safeName,
      fileType,
      description: 'Saved from Gmail attachment',
      workspaceId: lead.workspaceId,
      uploadedBy: req.user.id,
      folderId: null,
      links: [{ entityType: 'lead', entityId: lead.id }],
      source: 'gmail',
      folderIds: [],
    })

    return res.status(201).json({ success: true, data: { documentId: row.id }, meta: {} })
  } catch (e) {
    return next(e)
  }
}
