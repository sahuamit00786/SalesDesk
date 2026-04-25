import { getRedis } from '../config/redis.js'

/** @type {Map<string, { count: number, resetAt: number }>} */
const memoryBuckets = new Map()

function pruneMemoryBuckets() {
  const now = Date.now()
  for (const [k, v] of memoryBuckets) {
    if (now >= v.resetAt) memoryBuckets.delete(k)
  }
}

function checkMemoryLimit(ip, routeKey, windowSec, max) {
  if (memoryBuckets.size > 50_000) pruneMemoryBuckets()
  const key = `${ip}:${routeKey || 'global'}`
  const now = Date.now()
  const windowMs = windowSec * 1000
  let entry = memoryBuckets.get(key)
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    memoryBuckets.set(key, entry)
  }
  entry.count += 1
  if (entry.count > max) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
  }
  return { limited: false, retryAfter: 0 }
}

/**
 * Sliding-window style limiter using Redis when available, otherwise in-memory (per process).
 * Sets `Retry-After` when returning 429.
 */
export function rateLimit({ routeKey, windowSec = 60, max = 120 } = {}) {
  return async function rateLimitMiddleware(req, res, next) {
    const redis = getRedis()
    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    const keySuffix = routeKey || req.path || 'route'

    if (redis) {
      const key = `rl:${ip}:${keySuffix}`
      try {
        const count = await redis.incr(key)
        if (count === 1) {
          await redis.expire(key, windowSec)
        }
        if (count > max) {
          const ttl = await redis.ttl(key)
          const retryAfter = ttl > 0 ? ttl : windowSec
          res.setHeader('Retry-After', String(retryAfter))
          return res.status(429).json({
            success: false,
            error: { code: 'RATE_LIMIT', message: 'Too many requests. Try again shortly.' },
          })
        }
        return next()
      } catch {
        // Redis unavailable: enforce in-process limit instead of failing open
      }
    }

    const mem = checkMemoryLimit(ip, keySuffix, windowSec, max)
    if (mem.limited) {
      res.setHeader('Retry-After', String(mem.retryAfter))
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many requests. Try again shortly.' },
      })
    }
    return next()
  }
}
