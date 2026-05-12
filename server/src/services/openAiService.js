import dotenv from 'dotenv'

dotenv.config()

export async function generateWebFormEmailTemplate({ objective, formName }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing')
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const prompt = `You are writing CRM form follow-up emails. Objective: ${objective}. Form: ${formName}.
Return JSON with keys: subject, bodyHtml.
Use placeholders {{name}}, {{email}}, {{form_name}}, {{submission_date}} where appropriate.
Keep tone professional and concise.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`)
  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)
  return {
    subject: String(parsed.subject || ''),
    bodyHtml: String(parsed.bodyHtml || ''),
  }
}
