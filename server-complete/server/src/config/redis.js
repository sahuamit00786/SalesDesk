import Redis from 'ioredis'

let client

export function getRedis() {
  if (client !== undefined) return client
  const url = process.env.REDIS_URL
  if (!url) {
    client = null
    return client
  }
  client = new Redis(url, { maxRetriesPerRequest: 2, enableReadyCheck: true })
  client.on('error', () => {
    // Connection issues are surfaced via rate limiter fallback
  })
  return client
}
