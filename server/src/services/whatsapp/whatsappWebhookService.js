import { Op } from 'sequelize'
import { WhatsAppConversation, WhatsAppMessage, Lead } from '../../models/index.js'
import { phoneDigitsKey } from '../../utils/phoneDigits.js'
import { enqueueMediaDownload } from '../../queues/whatsappMediaQueue.js'

const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'document', 'sticker'])
const KNOWN_TYPES = new Set([
  'text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'template', 'interactive', 'button', 'reaction',
])

function normalizeType(rawType) {
  return KNOWN_TYPES.has(rawType) ? rawType : 'unknown'
}

function previewForMessage(type, message) {
  if (type === 'text') return (message.text?.body || '').slice(0, 255)
  if (type === 'location') return message.location?.name || 'Location'
  if (MEDIA_TYPES.has(type)) return message.type ? `[${message.type}]` : '[media]'
  return `[${type}]`
}

async function findLeadForCompany(companyId, waPhoneNumber) {
  const key = phoneDigitsKey(waPhoneNumber)
  if (!key) return null
  return Lead.findOne({
    where: {
      companyId,
      isDeleted: false,
      [Op.or]: [{ phoneDigits: key }, { altPhoneDigits: key }],
    },
  })
}

export async function findOrCreateConversation(companyId, waPhoneNumber, contactName) {
  const waPhoneDigits = phoneDigitsKey(waPhoneNumber)
  const [conversation] = await WhatsAppConversation.findOrCreate({
    where: { companyId, waPhoneNumber },
    defaults: { companyId, waPhoneNumber, waPhoneDigits, contactName },
  })
  const updates = {}
  if (contactName && conversation.contactName !== contactName) updates.contactName = contactName
  // A message reopens a deleted chat — matches WhatsApp's own "delete chat" semantics.
  if (conversation.deletedAt) updates.deletedAt = null
  if (!conversation.leadId) {
    const lead = await findLeadForCompany(companyId, waPhoneNumber)
    if (lead) {
      updates.leadId = lead.id
      updates.workspaceId = lead.workspaceId
    }
  }
  if (Object.keys(updates).length) await conversation.update(updates)
  return conversation
}

/** Inbound reaction: attaches to the existing message it targets, not a new row of its own. */
async function ingestReaction({ companyId, message }) {
  const targetWaMessageId = message.reaction?.message_id
  if (!targetWaMessageId) return
  const target = await WhatsAppMessage.findOne({ where: { companyId, waMessageId: targetWaMessageId } })
  if (!target) return
  // Empty emoji string means the customer removed their reaction.
  await target.update({ reaction: message.reaction?.emoji || null })
}

async function ingestMessage({ companyId, conversation, message, contacts }) {
  const type = normalizeType(message.type)
  const contactName = contacts?.find((c) => c.wa_id === message.from)?.profile?.name || null

  if (type === 'reaction') {
    await ingestReaction({ companyId, message })
    return
  }

  const row = await WhatsAppMessage.create({
    companyId,
    conversationId: conversation.id,
    direction: 'inbound',
    waMessageId: message.id,
    type,
    textBody: type === 'text' ? message.text?.body || null : null,
    mediaId: message[type]?.id || null,
    mimeType: message[type]?.mime_type || null,
    fileName: message.document?.filename || null,
    caption: message[type]?.caption || null,
    latitude: message.location?.latitude ?? null,
    longitude: message.location?.longitude ?? null,
    locationName: message.location?.name || null,
    replyToWaMessageId: message.context?.id || null,
    status: 'received',
    rawPayload: message,
    waTimestamp: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
  })

  await conversation.update({
    contactName: contactName || conversation.contactName,
    lastMessageAt: row.waTimestamp,
    lastInboundMessageAt: row.waTimestamp,
    lastMessageDirection: 'inbound',
    lastMessagePreview: previewForMessage(type, message),
    unreadCount: (conversation.unreadCount || 0) + 1,
  })

  if (MEDIA_TYPES.has(type) && message[type]?.id) {
    enqueueMediaDownload({ companyId, messageId: row.id, mediaId: message[type].id }).catch(() => {})
  }
}

async function ingestStatus({ companyId, status }) {
  const message = await WhatsAppMessage.findOne({ where: { companyId, waMessageId: status.id } })
  if (!message) return
  const nextStatus = ['sent', 'delivered', 'read', 'failed'].includes(status.status) ? status.status : message.status
  await message.update({
    status: nextStatus,
    errorMessage: status.errors?.[0]?.title || message.errorMessage,
  })
}

export async function processWhatsAppWebhookPayload({ companyId, settings, body }) {
  const entries = Array.isArray(body?.entry) ? body.entry : []
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change.value || {}
      if (settings?.phoneNumberId && value.metadata?.phone_number_id && value.metadata.phone_number_id !== settings.phoneNumberId) {
        // Payload doesn't match this company's configured number — skip, don't trust it.
        continue
      }

      const messages = Array.isArray(value.messages) ? value.messages : []
      for (const message of messages) {
        const contactName = value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name || null
        const conversation = await findOrCreateConversation(companyId, message.from, contactName)
        await ingestMessage({ companyId, conversation, message, contacts: value.contacts })
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses : []
      for (const status of statuses) {
        await ingestStatus({ companyId, status })
      }
    }
  }
}
