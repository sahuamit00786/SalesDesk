import { getRedis } from '../config/redis.js'

export async function verifyRecaptcha(token, secretKey) {
  const params = new URLSearchParams({ secret: secretKey, response: token })
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await response.json()
  const score = Number(data?.score || 0)
  return { isValid: Boolean(data?.success) && score >= 0.5, score }
}

export async function checkSpam(req, formConfig) {
  const result = { isSpam: false, spamScore: null, reason: null }
  if (formConfig.honeypotEnabled !== false && String(req.body?._fynlo_hp || '').length > 0) {
    result.isSpam = true
    result.reason = 'honeypot'
    return result
  }

  const redis = getRedis()
  if (redis) {
    const key = `form:submit:${formConfig.id}:${req.ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 3600)
    if (count > 3) return { ...result, isSpam: true, reason: 'rate_limit' }
  }

  if (formConfig.recaptchaEnabled && formConfig.recaptchaSecretKey) {
    const token = req.body?._recaptcha_token
    if (!token) return { ...result, isSpam: true, reason: 'missing_recaptcha' }
    const verified = await verifyRecaptcha(token, formConfig.recaptchaSecretKey)
    result.spamScore = verified.score
    if (!verified.isValid) return { ...result, isSpam: true, reason: 'recaptcha_failed' }
  }
  return result
}
