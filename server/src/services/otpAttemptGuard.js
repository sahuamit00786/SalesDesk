import { getRedis } from '../config/redis.js'

/**
 * §6.6 of the bug audit: OTP rate limiting was per-IP only (5/hour), so an attacker
 * rotating IPs faced no limit on guessing a 6-digit code against one specific account.
 * This adds a per-ACCOUNT attempt counter alongside the existing per-IP limiter — an
 * attacker now hits this ceiling regardless of how many IPs they spread requests across.
 * Same atomic SET-NX-EX pattern as the per-IP limiter (§6.5), Redis-backed with an
 * in-memory per-process fallback when Redis isn't configured.
 */

/** @type {Map<string, { count: number, resetAt: number }>} */
const memoryBuckets = new Map()

function keyFor(purpose, identifier) {
  return `otp-attempts:${purpose}:${String(identifier || '').trim().toLowerCase()}`
}

function memoryExceeded(key, max, windowSec) {
  const now = Date.now()
  let entry = memoryBuckets.get(key)
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowSec * 1000 }
    memoryBuckets.set(key, entry)
  }
  entry.count += 1
  return entry.count > max
}

/** True if this account has already made too many OTP verification attempts recently. */
export async function otpAttemptsExceeded(purpose, identifier, { max = 5, windowSec = 900 } = {}) {
  const key = keyFor(purpose, identifier)
  const redis = getRedis()
  if (redis) {
    try {
      const created = await redis.set(key, 1, 'EX', windowSec, 'NX')
      const count = created === 'OK' ? 1 : await redis.incr(key)
      return count > max
    } catch {
      // Redis unavailable — fall back to the in-process counter below.
    }
  }
  return memoryExceeded(key, max, windowSec)
}

/** Reset the counter on a successful verification so earlier typos don't linger. */
export async function clearOtpAttempts(purpose, identifier) {
  const key = keyFor(purpose, identifier)
  const redis = getRedis()
  if (redis) await redis.del(key).catch(() => {})
  memoryBuckets.delete(key)
}
