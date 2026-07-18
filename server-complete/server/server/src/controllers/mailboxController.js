import Joi from 'joi'
import { Op } from 'sequelize'
import { CompanyGoogleToken, Lead } from '../models/index.js'
import { bindGmailForTokenRow } from '../services/gmail/gmailPushService.js'
import { parseAddressList, parseHeader } from '../services/gmail/gmailMessageParse.js'
import { gmailParserService } from '../services/gmailParserService.js'
import { createDocumentWithLinks } from '../services/documentsService.js'
import { allowedWorkspaceIdsForUser } from '../services/userWorkspaceService.js'

async function companyMailboxToken(companyId) {
  return CompanyGoogleToken.findOne({
    where: { companyId },
    order: [['updatedAt', 'DESC']],
  })
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
    const tokenRow = await companyMailboxToken(req.user.companyId)
    if (!tokenRow?.refreshToken) {
      return res.status(400).json({ success: false, error: { code: 'GOOGLE_EMAIL_NOT_CONNECTED', message: 'Connect Google' } })
    }
    const messageId = String(req.params.messageId || '')
    const attachmentId = String(req.params.attachmentId || '')
    const fileName = String(req.query.fileName || 'attachment').replace(/[^\w.\- ]+/g, '_')
    if (!messageId || !attachmentId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'Missing ids' } })
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

    const tokenRow = await companyMailboxToken(req.user.companyId)
    if (!tokenRow?.refreshToken) {
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

    const { oauth2Client } = bindGmailForTokenRow(tokenRow)
    const buffer = await gmailParserService.fetchAttachment(oauth2Client, value.messageId, value.attachmentId)
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
