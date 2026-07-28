import Joi from 'joi'

const NAME_REGEX = /^[a-z0-9_]+$/

export const createWhatsAppTemplateSchema = Joi.object({
  name: Joi.string()
    .trim()
    .pattern(NAME_REGEX)
    .min(3)
    .max(512)
    .required()
    .messages({ 'string.pattern.base': 'Template name must be lowercase letters, numbers, and underscores only' }),
  // AUTHENTICATION templates use a different fixed Meta format (auto-generated body,
  // mandatory copy-code button) that isn't built here — MARKETING/UTILITY only for now.
  category: Joi.string().valid('MARKETING', 'UTILITY').required(),
  language: Joi.string().trim().min(2).max(16).default('en_US'),
  headerType: Joi.string().valid('none', 'text').default('none'),
  headerText: Joi.string()
    .trim()
    .max(60)
    .when('headerType', { is: 'text', then: Joi.required(), otherwise: Joi.forbidden() }),
  bodyText: Joi.string().trim().min(1).max(1024).required(),
  footerText: Joi.string().trim().max(60).allow('', null).optional(),
  buttons: Joi.array()
    .max(3)
    .items(
      Joi.object({
        type: Joi.string().valid('QUICK_REPLY', 'URL', 'PHONE_NUMBER').required(),
        text: Joi.string().trim().max(25).required(),
        url: Joi.string().uri().max(2000).when('type', { is: 'URL', then: Joi.required(), otherwise: Joi.forbidden() }),
        phone_number: Joi.string()
          .trim()
          .max(20)
          .when('type', { is: 'PHONE_NUMBER', then: Joi.required(), otherwise: Joi.forbidden() }),
      }),
    )
    .optional(),
  variableSamples: Joi.object({
    header: Joi.array().items(Joi.string().max(60)).optional(),
    body: Joi.array().items(Joi.string().max(255)).optional(),
  }).optional(),
})

export const sendWhatsAppTemplateSchema = Joi.object({
  templateId: Joi.string().uuid().required(),
  variableValues: Joi.object({
    header: Joi.array().items(Joi.string().max(60)).optional(),
    body: Joi.array().items(Joi.string().max(1024)).optional(),
  })
    .optional()
    .default({}),
})
