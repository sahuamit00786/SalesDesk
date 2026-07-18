import fs from 'fs'
import { getOpenAI } from './openAiClient.js'
import { withRetry } from '../utils/withRetry.js'

/**
 * Transcribe audio file using OpenAI whisper-1.
 * Returns { text: string, segments: Array<{start, end, text, avg_logprob}> }
 */
export async function transcribeAudio(audioPath) {
  return withRetry(async () => {
    const response = await getOpenAI().audio.transcriptions.create({
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
