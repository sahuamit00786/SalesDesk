import fs from 'node:fs/promises'
import { CompanyWhatsAppSettings, WhatsAppMessage } from '../../models/index.js'
import { decryptSecret } from '../../utils/secretCrypto.js'
import { httpError } from '../../utils/httpError.js'
import { resolveStoredFile } from '../storageService.js'
import { sendTextMessage, sendMediaMessage, uploadMediaToMeta, sendReaction, sendTemplateMessage } from './whatsappGraphClient.js'
import { extractVariableIndices, substituteVariables } from './whatsappTemplatesService.js'

async function requireVerifiedSettings(companyId) {
  const settings = await CompanyWhatsAppSettings.scope('withSecret').findOne({ where: { companyId } })
  if (!settings?.isVerified || !settings.accessTokenEncrypted) {
    throw httpError(400, 'WHATSAPP_NOT_CONFIGURED', 'Connect WhatsApp Business API in Integrations before sending messages')
  }
  return settings
}

/**
 * Records the failure on the row and returns normally (does NOT re-throw). A failed
 * send is still a real event in the conversation — it must show up immediately in the
 * thread with its error, the same way a genuinely sent message would, not disappear
 * until the next poll because the request "errored".
 */
async function markFailed(row, err) {
  await row.update({ status: 'failed', errorMessage: err?.message || 'Send failed' })
}

export async function sendText({ companyId, conversation, text, sentByUserId, replyToWaMessageId }) {
  const settings = await requireVerifiedSettings(companyId)
  const accessToken = decryptSecret(settings.accessTokenEncrypted)

  const row = await WhatsAppMessage.create({
    companyId,
    conversationId: conversation.id,
    direction: 'outbound',
    type: 'text',
    textBody: text,
    replyToWaMessageId: replyToWaMessageId || null,
    status: 'queued',
    sentByUserId,
    waTimestamp: new Date(),
  })

  try {
    const result = await sendTextMessage({
      phoneNumberId: settings.phoneNumberId,
      to: conversation.waPhoneNumber,
      text,
      accessToken,
      replyToWaMessageId,
    })
    await row.update({ waMessageId: result?.messages?.[0]?.id || null, status: 'sent' })
  } catch (err) {
    await markFailed(row, err)
  }

  await conversation.update({
    lastMessageAt: row.waTimestamp,
    lastMessageDirection: 'outbound',
    lastMessagePreview: text.slice(0, 255),
  })
  return row
}

export async function sendMedia({ companyId, conversation, type, mediaRef, caption, fileName, mimeType, sentByUserId, replyToWaMessageId }) {
  const settings = await requireVerifiedSettings(companyId)
  const accessToken = decryptSecret(settings.accessTokenEncrypted)

  const resolved = resolveStoredFile(mediaRef)
  if (!resolved || resolved.scope !== 'whatsapp' || resolved.workspaceId !== companyId) {
    throw httpError(400, 'VALIDATION', 'Invalid media reference — upload the file first via /whatsapp/media')
  }
  const buffer = await fs.readFile(resolved.absPath)

  const row = await WhatsAppMessage.create({
    companyId,
    conversationId: conversation.id,
    direction: 'outbound',
    type,
    mediaUrl: mediaRef,
    mimeType: mimeType || null,
    fileName: fileName || null,
    caption: caption || null,
    replyToWaMessageId: replyToWaMessageId || null,
    status: 'queued',
    sentByUserId,
    waTimestamp: new Date(),
  })

  try {
    const mediaId = await uploadMediaToMeta({ phoneNumberId: settings.phoneNumberId, buffer, mimeType, fileName, accessToken })
    if (!mediaId) throw httpError(502, 'WHATSAPP_API_ERROR', 'WhatsApp did not return a media id for the uploaded file')
    const result = await sendMediaMessage({
      phoneNumberId: settings.phoneNumberId,
      to: conversation.waPhoneNumber,
      type,
      mediaId,
      caption,
      accessToken,
      replyToWaMessageId,
    })
    await row.update({ mediaId, waMessageId: result?.messages?.[0]?.id || null, status: 'sent' })
  } catch (err) {
    await markFailed(row, err)
  }

  await conversation.update({
    lastMessageAt: row.waTimestamp,
    lastMessageDirection: 'outbound',
    lastMessagePreview: `[${type}]`,
  })
  return row
}

/** Sends an approved template — the only way to message a customer outside the 24h window. */
export async function sendTemplate({ companyId, conversation, template, variableValues, sentByUserId }) {
  const settings = await requireVerifiedSettings(companyId)
  const accessToken = decryptSecret(settings.accessTokenEncrypted)
  if (template.status !== 'approved') {
    throw httpError(400, 'TEMPLATE_NOT_APPROVED', 'This template is not yet approved by Meta — it cannot be sent')
  }

  const headerVars = template.headerType === 'text' ? extractVariableIndices(template.headerText) : []
  const bodyVars = extractVariableIndices(template.bodyText)

  const components = []
  if (headerVars.length) {
    components.push({
      type: 'header',
      parameters: headerVars.map((i) => ({ type: 'text', text: variableValues?.header?.[i - 1] || '' })),
    })
  }
  if (bodyVars.length) {
    components.push({
      type: 'body',
      parameters: bodyVars.map((i) => ({ type: 'text', text: variableValues?.body?.[i - 1] || '' })),
    })
  }

  const renderedHeader = template.headerType === 'text' ? substituteVariables(template.headerText, variableValues?.header) : ''
  const renderedBody = substituteVariables(template.bodyText, variableValues?.body)
  const textBody = [renderedHeader, renderedBody].filter(Boolean).join('\n\n')

  const row = await WhatsAppMessage.create({
    companyId,
    conversationId: conversation.id,
    direction: 'outbound',
    type: 'template',
    textBody,
    status: 'queued',
    sentByUserId,
    waTimestamp: new Date(),
  })

  try {
    const result = await sendTemplateMessage({
      phoneNumberId: settings.phoneNumberId,
      to: conversation.waPhoneNumber,
      templateName: template.name,
      languageCode: template.language,
      components,
      accessToken,
    })
    await row.update({ waMessageId: result?.messages?.[0]?.id || null, status: 'sent' })
  } catch (err) {
    await markFailed(row, err)
  }

  await conversation.update({
    lastMessageAt: row.waTimestamp,
    lastMessageDirection: 'outbound',
    lastMessagePreview: renderedBody.slice(0, 255),
  })
  return row
}

/** Toggles our reaction to a message the customer sent us (react/un-react). */
export async function sendReactionToMessage({ companyId, conversation, targetMessage, emoji }) {
  const settings = await requireVerifiedSettings(companyId)
  const accessToken = decryptSecret(settings.accessTokenEncrypted)
  if (!targetMessage.waMessageId) {
    throw httpError(400, 'VALIDATION', 'Cannot react to a message that has not been delivered by WhatsApp yet')
  }
  await sendReaction({
    phoneNumberId: settings.phoneNumberId,
    to: conversation.waPhoneNumber,
    waMessageId: targetMessage.waMessageId,
    emoji,
    accessToken,
  })
  await targetMessage.update({ reaction: emoji || null })
  return targetMessage
}
