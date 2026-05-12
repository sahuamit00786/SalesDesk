import fs from "fs"
import OpenAI from "openai"
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
})

const transcribeModel =
  process.env.GROQ_TRANSCRIBE_MODEL?.trim() || "whisper-large-v3-turbo"

export async function transcribeAudio(audioPath) {
  const transcription = await client.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: transcribeModel,
  })

  return transcription.text
}