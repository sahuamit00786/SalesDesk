import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
})

const chatModel =
  process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile"

export async function generateSummary(transcript) {
  const response = await client.chat.completions.create({
    model: chatModel,
    messages: [
      {
        role: "system",
        content: "Generate meeting summary with action items",
      },
      {
        role: "user",
        content: transcript,
      },
    ],
  })

  return response.choices[0].message.content
}