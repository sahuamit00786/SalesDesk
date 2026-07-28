import Joi from 'joi'

export const saveWhatsAppSettingsSchema = Joi.object({
  phoneNumberId: Joi.string().trim().min(5).max(64).required(),
  wabaId: Joi.string().trim().min(5).max(64).required(),
  accessToken: Joi.string().trim().min(20).max(4096).required(),
  appSecret: Joi.string().trim().min(10).max(256).allow('', null).optional(),
})

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker']

export const sendWhatsAppMessageSchema = Joi.object({
  type: Joi.string()
    .valid('text', ...MEDIA_TYPES)
    .required(),
  text: Joi.string().trim().min(1).max(4096).when('type', { is: 'text', then: Joi.required(), otherwise: Joi.forbidden() }),
  mediaRef: Joi.string().trim().when('type', { is: Joi.valid(...MEDIA_TYPES), then: Joi.required(), otherwise: Joi.forbidden() }),
  caption: Joi.string().trim().max(1024).allow('', null).optional(),
  fileName: Joi.string().trim().max(255).allow('', null).optional(),
  mimeType: Joi.string().trim().max(100).allow('', null).optional(),
  replyToMessageId: Joi.string().uuid().allow(null).optional(),
})

export const createWhatsAppConversationSchema = Joi.object({
  phoneNumber: Joi.string().trim().min(6).max(32).required(),
  contactName: Joi.string().trim().max(255).allow('', null).optional(),
  leadId: Joi.string().uuid().allow(null).optional(),
})

export const reactToWhatsAppMessageSchema = Joi.object({
  // Empty string clears an existing reaction.
  emoji: Joi.string().trim().max(8).allow('', null).required(),
})

export const updateWhatsAppConversationSchema = Joi.object({
  isPinned: Joi.boolean().optional(),
  isArchived: Joi.boolean().optional(),
  isMuted: Joi.boolean().optional(),
}).min(1)
