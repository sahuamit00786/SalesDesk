import fs from 'fs'
import OpenAI from 'openai'
import { withRetry } from '../utils/withRetry.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Transcribe audio file using OpenAI whisper-1.
 * Returns { text: string, segments: Array<{start, end, text, avg_logprob}> }
 */
export async function transcribeAudio(audioPath) {
  return withRetry(async () => {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
    })
    return {
      text: response.text ?? '',
      segments: Array.isArray(response.segments) ? response.segments : [],
    }
  })
}
