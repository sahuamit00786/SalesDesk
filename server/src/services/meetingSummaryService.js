import OpenAI from 'openai'
import { withRetry } from '../utils/withRetry.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Generate a plain-text meeting summary using gpt-4o-mini.
 * Returns a formatted string suitable for PDF and DB storage.
 */
export async function generateSummary(transcript) {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Generate a concise meeting summary covering key discussion points, decisions made, and action items.',
        },
        { role: 'user', content: transcript },
      ],
    })
    return response.choices[0].message.content ?? ''
  })
}
