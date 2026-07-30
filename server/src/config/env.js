import Joi from 'joi'

const requiredInProd = (base) => Joi.when('NODE_ENV', { is: 'production', then: base.required(), otherwise: base.optional() })

// Must decode to exactly 32 bytes — mirrors the check secretCrypto.getKey() does at
// call time. Catching a bad key at boot beats discovering it on the first WhatsApp
// webhook or credential read (§13.2 of the bug audit).
const base64Key32 = Joi.string().custom((value, helpers) => {
  let decoded
  try {
    decoded = Buffer.from(value, 'base64')
  } catch {
    return helpers.error('any.invalid')
  }
  if (decoded.length !== 32) return helpers.error('any.invalid')
  return value
}, 'base64-32-byte-key').messages({ 'any.invalid': 'must be a base64 string decoding to 32 bytes' })

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_HOST: Joi.string().default('127.0.0.1'),
  DB_PORT: Joi.number().default(3306),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  REDIS_URL: Joi.string().allow('', null).optional(),
  OPENAI_API_KEY: Joi.string().allow('', null).optional(),
  OPENAI_MODEL: Joi.string().allow('', null).optional(),
  // Required in production — an unset value here silently breaks tracking links, unsubscribe
  // links, and outbound email in ways that look fine at boot but fail for every recipient.
  API_BASE_URL: requiredInProd(Joi.string().uri()),
  CLIENT_ORIGIN: requiredInProd(Joi.string()),
  SMTP_HOST: requiredInProd(Joi.string()),
  SMTP_USER: requiredInProd(Joi.string()),
  SMTP_PASS: requiredInProd(Joi.string()),
  SMTP_FROM: Joi.string().allow('', null).optional(),
  SMTP_CREDENTIALS_ENC_KEY: requiredInProd(base64Key32),
}).unknown(true)

export function validateEnv() {
  const { error, value } = schema.validate(process.env, { abortEarly: false, convert: true })
  if (error) {
    throw new Error(`Invalid environment: ${error.message}`)
  }
  return value
}
