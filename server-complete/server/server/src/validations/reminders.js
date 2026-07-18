import Joi from 'joi'

export const createReminderSchema = Joi.object({
  title: Joi.string().max(255).required(),
  notes: Joi.string().allow('').optional(),
  remindAt: Joi.date().iso().required(),
  targetType: Joi.string().valid('general', 'lead', 'opportunity', 'meeting', 'task', 'followup').default('general'),
  targetId: Joi.string().guid({ version: 'uuidv4' }).optional().allow(null),
  color: Joi.string().max(7).optional(),
  channelPush: Joi.boolean().default(true),
  channelEmail: Joi.boolean().default(true),
  ownerUserId: Joi.string().guid({ version: 'uuidv4' }).optional(),
})

export const patchReminderSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  notes: Joi.string().allow('').optional(),
  remindAt: Joi.date().iso().optional(),
  status: Joi.string().valid('pending', 'done', 'dismissed').optional(),
  targetType: Joi.string().valid('general', 'lead', 'opportunity', 'meeting', 'task', 'followup').optional(),
  targetId: Joi.string().guid({ version: 'uuidv4' }).optional().allow(null),
  color: Joi.string().max(7).optional(),
  channelPush: Joi.boolean().optional(),
  channelEmail: Joi.boolean().optional(),
  ownerUserId: Joi.string().guid({ version: 'uuidv4' }).optional(),
})

export const listRemindersSchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  status: Joi.string().valid('pending', 'done', 'dismissed').optional(),
  ownerUserId: Joi.string().guid({ version: 'uuidv4' }).optional(),
  targetType: Joi.string().valid('general', 'lead', 'opportunity', 'meeting', 'task', 'followup').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
})
