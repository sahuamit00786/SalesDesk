/**
 * Retry async fn up to maxAttempts times with exponential backoff.
 * Does not retry on 400/401/403 — those are deterministic failures.
 */
export async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1000) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const status = err?.status ?? err?.response?.status
      if (status === 400 || status === 401 || status === 403) throw err
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt))
      }
    }
  }
  throw lastErr
}
