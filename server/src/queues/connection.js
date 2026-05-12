/** Shared BullMQ Redis connection config (same as REDIS_URL for email queue). */
export function bullmqConnectionFromEnv() {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  return { url: redisUrl }
}
