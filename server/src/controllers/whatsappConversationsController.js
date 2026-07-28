import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Op } from 'sequelize'
import { WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate, CompanyWhatsAppSettings, Lead, User } from '../models/index.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { httpError } from '../utils/httpError.js'
import {
  sendWhatsAppMessageSchema,
  createWhatsAppConversationSchema,
  reactToWhatsAppMessageSchema,
  updateWhatsAppConversationSchema,
} from '../validations/whatsapp.js'
import { sendWhatsAppTemplateSchema } from '../validations/whatsappTemplates.js'
import { sendText, sendMedia, sendReactionToMessage, sendTemplate } from '../services/whatsapp/whatsappSendService.js'
import { findOrCreateConversation } from '../services/whatsapp/whatsappWebhookService.js'

const PAGE_SIZE = 30
const SEARCH_LIMIT = 50

function getUploadsRoot() {
  return path.resolve(process.cwd(), 'uploads', 'whatsapp')
}

function safeFileName(name) {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180)
}

function normalizeWaPhoneNumber(raw) {
  return String(raw || '').replace(/\D/g, '')
}

/**
 * Meta's webhooks always report a customer's number as the full MSISDN (country
 * code + subscriber number, e.g. "917007033419") — if someone starts a chat by typing
 * just the bare 10-digit local number, it lands in a DIFFERENT conversation the moment
 * that contact actually replies. Default a bare 10-digit input to the same country code
 * as this company's own WhatsApp number, so it matches what the webhook will use.
 */
function inferCompanyCountryCode(displayPhoneNumber) {
  const digits = normalizeWaPhoneNumber(displayPhoneNumber)
  return digits.length > 10 ? digits.slice(0, digits.length - 10) : ''
}

function isPrivilegedWhatsAppUser(user) {
  return Boolean(user.isCompanyAdmin) || user.userRoleKind === 'workspace_admin' || user.userRoleKind === 'manager'
}

/**
 * The company's WhatsApp number is shared, but a rep should only see chats tied to a
 * lead assigned to (or owned by) them — mirrors lead list visibility. Admins/managers/
 * workspace admins see every chat, including ones with no matched lead yet.
 */
async function conversationLeadInclude(user) {
  if (isPrivilegedWhatsAppUser(user)) {
    return { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName'], required: false }
  }
  const leadWhere = await leadAccessWhere(user)
  return { model: Lead, as: 'lead', attributes: ['id', 'title', 'contactName'], required: true, where: leadWhere }
}

async function loadConversation(user, conversationId) {
  const leadInclude = await conversationLeadInclude(user)
  const conversation = await WhatsAppConversation.findOne({
    where: { id: conversationId, companyId: user.companyId },
    include: [leadInclude],
  })
  if (!conversation) throw httpError(404, 'NOT_FOUND', 'Conversation not found')
  return conversation
}

async function loadMessage(companyId, conversationId, messageId) {
  const message = await WhatsAppMessage.findOne({ where: { id: messageId, companyId, conversationId } })
  if (!message) throw httpError(404, 'NOT_FOUND', 'Message not found')
  return message
}

export async function listConversations(req, res, next) {
  try {
    const companyId = req.user.companyId
    const search = String(req.query.search || '').trim()
    const showArchived = req.query.archived === 'true' || req.query.archived === '1'
    const where = { companyId, isArchived: showArchived, deletedAt: null }
    if (req.query.leadId) where.leadId = req.query.leadId
    if (search) {
      where[Op.or] = [
        { contactName: { [Op.like]: `%${search}%` } },
        { waPhoneNumber: { [Op.like]: `%${normalizeWaPhoneNumber(search) || search}%` } },
      ]
    }
    const conversations = await WhatsAppConversation.findAll({
      where,
      include: [await conversationLeadInclude(req.user)],
      order: [['isPinned', 'DESC'], ['pinOrder', 'ASC'], ['lastMessageAt', 'DESC']],
      limit: 100,
    })
    res.json({ success: true, data: conversations })
  } catch (err) {
    next(err)
  }
}

export async function updateConversation(req, res, next) {
  try {
    const companyId = req.user.companyId
    const conversation = await loadConversation(req.user, req.params.id)
    const { error, value } = updateWhatsAppConversationSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) throw httpError(400, 'VALIDATION', error.details.map((d) => d.message).join('; '))

    if (value.isPinned === true && !conversation.isPinned) {
      const maxOrder = await WhatsAppConversation.max('pinOrder', { where: { companyId, isPinned: true } })
      value.pinOrder = (Number.isFinite(maxOrder) ? maxOrder : -1) + 1
    } else if (value.isPinned === false) {
      value.pinOrder = null
    }

    await conversation.update(value)
    res.json({ success: true, data: conversation })
  } catch (err) {
    next(err)
  }
}

/** Bulk-reassigns pinOrder to match the dragged order — only touches chats already pinned. */
export async function reorderPinnedConversations(req, res, next) {
  try {
    const companyId = req.user.companyId
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : []
    if (!orderedIds.length) throw httpError(400, 'VALIDATION', 'orderedIds is required')

    const leadInclude = await conversationLeadInclude(req.user)
    const conversations = await WhatsAppConversation.findAll({
      where: { id: orderedIds, companyId, isPinned: true },
      include: [{ ...leadInclude, attributes: [] }],
      attributes: ['id'],
    })
    const validIds = new Set(conversations.map((c) => c.id))

    await Promise.all(
      orderedIds
        .filter((id) => validIds.has(id))
        .map((id, index) => WhatsAppConversation.update({ pinOrder: index }, { where: { id, companyId } })),
    )
    res.json({ success: true, data: { updated: validIds.size } })
  } catch (err) {
    next(err)
  }
}

export async function markUnread(req, res, next) {
  try {
    const conversation = await loadConversation(req.user, req.params.id)
    await conversation.update({ unreadCount: Math.max(conversation.unreadCount || 0, 1) })
    res.json({ success: true, data: conversation })
  } catch (err) {
    next(err)
  }
}

/**
 * Soft-delete — hides the chat from the inbox; reopens automatically on the next
 * inbound message (see findOrCreateConversation). This mirrors how the WhatsApp app
 * itself handles "delete chat" (a local/client action, not a Business API concept) —
 * it clears it from view here without pretending to affect the other side.
 */
export async function deleteConversation(req, res, next) {
  try {
    const conversation = await loadConversation(req.user, req.params.id)
    await conversation.update({ deletedAt: new Date() })
    res.json({ success: true, data: { id: conversation.id } })
  } catch (err) {
    next(err)
  }
}

/** Start (or reopen) a conversation with a phone number that hasn't messaged in yet. */
export async function createConversation(req, res, next) {
  try {
    const companyId = req.user.companyId
    const { error, value } = createWhatsAppConversationSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) throw httpError(400, 'VALIDATION', error.details.map((d) => d.message).join('; '))

    let waPhoneNumber = normalizeWaPhoneNumber(value.phoneNumber)
    if (waPhoneNumber.length < 6) throw httpError(400, 'VALIDATION', 'Enter a valid phone number with country code')

    if (waPhoneNumber.length === 10) {
      const settings = await CompanyWhatsAppSettings.findOne({ where: { companyId } })
      const countryCode = inferCompanyCountryCode(settings?.displayPhoneNumber)
      if (countryCode) waPhoneNumber = countryCode + waPhoneNumber
    }

    const conversation = await findOrCreateConversation(companyId, waPhoneNumber, value.contactName || null)

    // Explicit leadId (from a lead/opportunity's WhatsApp tab) beats the webhook's own
    // phone-digit auto-match — that match is ambiguous when a lead and its converted
    // opportunity share the same number.
    if (value.leadId && conversation.leadId !== value.leadId) {
      const lead = await Lead.findOne({ where: { id: value.leadId, companyId } })
      if (lead) await conversation.update({ leadId: lead.id, workspaceId: lead.workspaceId })
    }

    res.json({ success: true, data: conversation })
  } catch (err) {
    next(err)
  }
}

export async function getMessages(req, res, next) {
  try {
    const companyId = req.user.companyId
    const conversation = await loadConversation(req.user, req.params.id)
    const before = req.query.before ? new Date(req.query.before) : null

    const where = { conversationId: conversation.id, companyId, hiddenAt: null }
    if (before && !Number.isNaN(before.getTime())) where.createdAt = { [Op.lt]: before }

    const rows = await WhatsAppMessage.findAll({
      where,
      include: [{ model: User, as: 'sentBy', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: PAGE_SIZE,
    })
    res.json({ success: true, data: rows.reverse(), conversation })
  } catch (err) {
    next(err)
  }
}

/** Text search within one conversation's history — used by the in-chat search UI. */
export async function searchMessages(req, res, next) {
  try {
    const companyId = req.user.companyId
    const conversation = await loadConversation(req.user, req.params.id)
    const q = String(req.query.q || '').trim()
    if (!q) return res.json({ success: true, data: [] })

    const rows = await WhatsAppMessage.findAll({
      where: { conversationId: conversation.id, companyId, hiddenAt: null, textBody: { [Op.like]: `%${q}%` } },
      order: [['createdAt', 'DESC']],
      limit: SEARCH_LIMIT,
    })
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
}

export async function markRead(req, res, next) {
  try {
    const conversation = await loadConversation(req.user, req.params.id)
    await conversation.update({ unreadCount: 0 })
    res.json({ success: true, data: conversation })
  } catch (err) {
    next(err)
  }
}

export async function getUnreadBadge(req, res, next) {
  try {
    const companyId = req.user.companyId
    const leadInclude = await conversationLeadInclude(req.user)
    const unread = await WhatsAppConversation.count({
      where: { companyId, unreadCount: { [Op.gt]: 0 } },
      include: [{ ...leadInclude, attributes: [] }],
      distinct: true,
      col: 'id',
    })
    res.json({ success: true, data: { unread } })
  } catch (err) {
    next(err)
  }
}

export async function sendMessage(req, res, next) {
  try {
    const companyId = req.user.companyId
    const conversation = await loadConversation(req.user, req.params.id)

    const { error, value } = sendWhatsAppMessageSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) throw httpError(400, 'VALIDATION', error.details.map((d) => d.message).join('; '))

    let replyToWaMessageId = null
    if (value.replyToMessageId) {
      const target = await WhatsAppMessage.findOne({ where: { id: value.replyToMessageId, companyId, conversationId: conversation.id } })
      if (!target?.waMessageId) throw httpError(400, 'VALIDATION', 'Cannot reply to that message')
      replyToWaMessageId = target.waMessageId
    }

    const row =
      value.type === 'text'
        ? await sendText({ companyId, conversation, text: value.text, sentByUserId: req.user.id, replyToWaMessageId })
        : await sendMedia({
            companyId,
            conversation,
            type: value.type,
            mediaRef: value.mediaRef,
            caption: value.caption,
            fileName: value.fileName,
            mimeType: value.mimeType,
            sentByUserId: req.user.id,
            replyToWaMessageId,
          })

    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
}

/** The only way to message a customer outside the 24h window — sends an approved template. */
export async function sendTemplateMessage(req, res, next) {
  try {
    const companyId = req.user.companyId
    const conversation = await loadConversation(req.user, req.params.id)

    const { error, value } = sendWhatsAppTemplateSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) throw httpError(400, 'VALIDATION', error.details.map((d) => d.message).join('; '))

    const template = await WhatsAppTemplate.findOne({ where: { id: value.templateId, companyId } })
    if (!template) throw httpError(404, 'NOT_FOUND', 'Template not found')

    const row = await sendTemplate({
      companyId,
      conversation,
      template,
      variableValues: value.variableValues,
      sentByUserId: req.user.id,
    })
    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
}

export async function reactToMessage(req, res, next) {
  try {
    const companyId = req.user.companyId
    const conversation = await loadConversation(req.user, req.params.id)
    const message = await loadMessage(companyId, conversation.id, req.params.messageId)

    const { error, value } = reactToWhatsAppMessageSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) throw httpError(400, 'VALIDATION', error.details.map((d) => d.message).join('; '))

    const row = await sendReactionToMessage({ companyId, conversation, targetMessage: message, emoji: value.emoji })
    res.json({ success: true, data: row })
  } catch (err) {
    next(err)
  }
}

export async function starMessage(req, res, next) {
  try {
    const companyId = req.user.companyId
    const conversation = await loadConversation(req.user, req.params.id)
    const message = await loadMessage(companyId, conversation.id, req.params.messageId)
    const starred = Boolean(req.body?.starred)
    await message.update({ isStarred: starred })
    res.json({ success: true, data: message })
  } catch (err) {
    next(err)
  }
}

/** All starred messages across every conversation for this company — shared-inbox-wide, not per-agent. */
export async function listStarredMessages(req, res, next) {
  try {
    const companyId = req.user.companyId
    const leadInclude = await conversationLeadInclude(req.user)
    const rows = await WhatsAppMessage.findAll({
      where: { companyId, isStarred: true, hiddenAt: null },
      include: [{
        model: WhatsAppConversation,
        as: 'conversation',
        attributes: ['id', 'contactName', 'waPhoneNumber'],
        required: true,
        include: [leadInclude],
      }],
      order: [['createdAt', 'DESC']],
      limit: 200,
    })
    res.json({ success: true, data: rows })
  } catch (err) {
    next(err)
  }
}

export async function uploadMedia(req, res, next) {
  try {
    const companyId = req.user.companyId
    if (!req.file) throw httpError(400, 'VALIDATION', 'File is required')

    const dir = path.join(getUploadsRoot(), companyId)
    await mkdir(dir, { recursive: true })
    const fileName = `${Date.now()}_${randomUUID()}_${safeFileName(req.file.originalname)}`
    await writeFile(path.join(dir, fileName), req.file.buffer)

    res.json({
      success: true,
      data: {
        mediaRef: `/uploads/whatsapp/${companyId}/${fileName}`,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
    })
  } catch (err) {
    next(err)
  }
}
