import Joi from 'joi'

const DESCRIPTION_MAX = 199

const CURRENCY_CODE = Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase()

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(240).required(),
  description: Joi.string().trim().max(DESCRIPTION_MAX).allow('').optional(),
  defaultCurrency: CURRENCY_CODE.optional(),
})

const HEX_COLOR = Joi.alternatives().try(
  Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/),
  Joi.valid(null),
).optional()

export const patchWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(240),
  archived: Joi.boolean(),
  description: Joi.alternatives()
    .try(Joi.string().trim().max(DESCRIPTION_MAX), Joi.valid(null))
    .optional(),
  themeColor: HEX_COLOR,
  sidebarTextColor: HEX_COLOR,
  defaultCurrency: CURRENCY_CODE.allow(null).optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one of name, description, or archived is required',
  })
