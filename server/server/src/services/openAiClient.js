import OpenAI from 'openai'

/**
 * Lazily-constructed OpenAI client.
 *
 * The OpenAI SDK throws at construction when OPENAI_API_KEY is missing, so
 * constructing at module load took the entire server down on any deploy that
 * omitted the key. Constructing on first use keeps the CRM booting; AI
 * endpoints fail with a typed 503 only when actually called.
 */
let client = null

export class AiUnavailableError extends Error {
  constructor(message = 'AI features are unavailable: OPENAI_API_KEY is not configured.') {
    super(message)
    this.name = 'AiUnavailableError'
    this.status = 503
    this.code = 'AI_UNAVAILABLE'
  }
}

export function getOpenAI() {
  if (client) return client
  if (!process.env.OPENAI_API_KEY) throw new AiUnavailableError()
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return client
}
