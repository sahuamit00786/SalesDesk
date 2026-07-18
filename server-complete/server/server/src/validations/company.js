import Joi from 'joi'

export const patchMyCompanySchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  websiteUrl: Joi.string().max(255).allow('', null).optional(),
  industry: Joi.string().max(120).allow('', null).optional(),
  city: Joi.string().max(120).allow('', null).optional(),
  country: Joi.string().max(2).allow('', null).optional(),
  employeeRange: Joi.string().max(32).allow('', null).optional(),
  monthlyLeadsBand: Joi.string().max(32).allow('', null).optional(),
  leadPainTags: Joi.array().items(Joi.string().max(80)).max(24).optional(),
  leadPainNotes: Joi.string().max(2000).allow('', null).optional(),
  currentToolsNotes: Joi.string().max(500).allow('', null).optional(),
  baseCurrency: Joi.string().trim().length(3).pattern(/^[A-Za-z]{3}$/).uppercase().optional(),
  onboardingCompleted: Joi.boolean().optional(),
})
  .min(1)
  .messages({
    'object.min': 'Provide at least one field to update',
  })
