import { getRedis } from '../config/redis.js'

export async function dashboardStats(req, res, next) {
  try {
    const redis = getRedis()
    const cacheKey = `stats:${req.user.id}`

    if (redis) {
      try {
        const cached = await redis.get(cacheKey)
        if (cached) {
          try {
            return res.json({
              success: true,
              data: JSON.parse(cached),
              meta: { cached: true },
            })
          } catch {
            // corrupt cache entry — recompute below
          }
        }
      } catch {
        // fall through to fresh payload
      }
    }

    const data = {
      openLeads: 0,
      pipelineValue: '$0',
      tasksDue: 0,
    }

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), 'EX', 300)
      } catch {
        // ignore cache write failures
      }
    }

    return res.json({
      success: true,
      data,
      meta: { cached: false },
    })
  } catch (e) {
    return next(e)
  }
}
