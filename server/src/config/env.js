import Joi from 'joi'

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
}).unknown(true)

export function validateEnv() {
  const { error, value } = schema.validate(process.env, { abortEarly: false, convert: true })
  if (error) {
    throw new Error(`Invalid environment: ${error.message}`)
  }
  return value
}
