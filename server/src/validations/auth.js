import Joi from 'joi'

const PASSWORD_MIN = 10
const PASSWORD_MAX = 128

function strongPassword(value, helpers) {
  if (typeof value !== 'string') return value
  const missing = []
  if (value.length < PASSWORD_MIN) missing.push(`at least ${PASSWORD_MIN} characters`)
  if (value.length > PASSWORD_MAX) missing.push(`at most ${PASSWORD_MAX} characters`)
  if (!/[a-z]/.test(value)) missing.push('one lowercase letter')
  if (!/[A-Z]/.test(value)) missing.push('one uppercase letter')
  if (!/\d/.test(value)) missing.push('one number')
  if (!/[!@#$%^&*()_+\-=[\]{}|;:',.<>/?]/.test(value)) missing.push('one symbol (e.g. ! @ # $)')
  if (missing.length) {
    return helpers.error('any.custom', {
      message: `Choose a stronger password: add ${missing.join(', ')}.`,
    })
  }
  return value
}

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  companyName: Joi.string().min(2).max(200).required(),
  email: Joi.string().email().required(),
  password: Joi.string().required().custom(strongPassword),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords must match',
  }),
})

export const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'OTP must be 6 digits',
  }),
})

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required(),
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
})
