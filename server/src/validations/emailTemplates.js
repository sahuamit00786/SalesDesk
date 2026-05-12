import Joi from 'joi'

const attachmentSchema = Joi.object({
  filename: Joi.string().max(255).required(),
  url: Joi.string().uri().max(2000).required(),
  size: Joi.number().integer().min(0).required(),
})

export const createTemplateSchema = Joi.object({
  name: Joi.string().trim().max(255).required(),
  subject: Joi.string().allow('').max(500).required(),
  bodyHtml: Joi.string().allow('').required(),
  category: Joi.string().valid('cold_outreach', 'follow_up', 'proposal', 're_engagement').required(),
  tags: Joi.array().items(Joi.string().trim().max(80)).max(30).default([]),
  attachments: Joi.array().items(attachmentSchema).max(3).default([]),
  throttlePerHour: Joi.number().integer().min(1).max(10000).allow(null).default(null),
  scheduleAt: Joi.date().iso().allow(null).default(null),
  autoUnsubscribeLink: Joi.boolean().default(true),
  skipIfAlreadySent: Joi.boolean().default(true),
})

export const updateTemplateSchema = Joi.object({
  name: Joi.string().trim().max(255).optional(),
  subject: Joi.string().allow('').max(500).optional(),
  bodyHtml: Joi.string().allow('').optional(),
  category: Joi.string().valid('cold_outreach', 'follow_up', 'proposal', 're_engagement').optional(),
  tags: Joi.array().items(Joi.string().trim().max(80)).max(30).optional(),
  attachments: Joi.array().items(attachmentSchema).max(3).optional(),
  throttlePerHour: Joi.number().integer().min(1).max(10000).allow(null).optional(),
  scheduleAt: Joi.date().iso().allow(null).optional(),
  autoUnsubscribeLink: Joi.boolean().optional(),
  skipIfAlreadySent: Joi.boolean().optional(),
}).min(1)

export const previewSendSchema = Joi.object({
  leadIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
})

export const sendTemplateSchema = Joi.object({
  leadIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  confirmed: Joi.boolean().default(true),
})
