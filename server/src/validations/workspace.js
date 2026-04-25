import Joi from 'joi'

const DESCRIPTION_MAX = 199

export const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(240).required(),
  description: Joi.string().trim().max(DESCRIPTION_MAX).allow('').optional(),
})

export const patchWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(240),
  archived: Joi.boolean(),
  description: Joi.alternatives()
    .try(Joi.string().trim().max(DESCRIPTION_MAX), Joi.valid(null))
    .optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one of name, description, or archived is required',
  })
