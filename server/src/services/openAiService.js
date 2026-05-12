/**
 * Custom error type so controllers can map provider failures to clean HTTP
 * responses (status / code / friendly message) instead of leaking stack traces
 * or returning generic 500s.
 */
export class OpenAiServiceError extends Error {
  constructor({ status, code, message, providerMessage }) {
    super(message || providerMessage || `OpenAI request failed: ${status}`)
    this.name = 'OpenAiServiceError'
    this.status = status
    this.code = code || null
    this.providerMessage = providerMessage || null
  }
}

async function callOpenAi(apiKey, payload) {
  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new OpenAiServiceError({
      status: 503,
      code: 'network_error',
      message: 'Could not reach the AI provider. Please try again.',
      providerMessage: err?.message,
    })
  }
  if (response.ok) return response.json()

  let providerCode = null
  let providerMessage = null
  try {
    const errorBody = await response.json()
    providerCode = errorBody?.error?.code || null
    providerMessage = errorBody?.error?.message || null
  } catch {
    /* keep nulls */
  }

  if (response.status === 429) {
    const isQuota = providerCode === 'insufficient_quota' || /quota/i.test(providerMessage || '')
    throw new OpenAiServiceError({
      status: isQuota ? 402 : 429,
      code: isQuota ? 'insufficient_quota' : 'rate_limited',
      message: isQuota
        ? 'AI is unavailable: the OpenAI account has run out of quota. Please add billing or try again after the quota resets.'
        : 'AI is busy right now (rate limit). Please try again in a moment.',
      providerMessage,
    })
  }
  if (response.status === 401) {
    throw new OpenAiServiceError({
      status: 503,
      code: 'invalid_api_key',
      message: 'AI is not configured correctly. Please contact your administrator.',
      providerMessage,
    })
  }
  throw new OpenAiServiceError({
    status: 502,
    code: providerCode || 'upstream_error',
    message: providerMessage || `AI provider error (${response.status}).`,
    providerMessage,
  })
}

export async function generateWebFormEmailTemplate({ objective, formName }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new OpenAiServiceError({
      status: 503,
      code: 'missing_api_key',
      message: 'AI is not configured (missing OPENAI_API_KEY).',
    })
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const prompt = `You are writing CRM form follow-up emails. Objective: ${objective}. Form: ${formName}.
Return JSON with keys: subject, bodyHtml.
Use placeholders {{name}}, {{email}}, {{form_name}}, {{submission_date}} where appropriate.
Keep tone professional and concise.`

  const data = await callOpenAi(apiKey, {
    model,
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  })
  const content = data?.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)
  return {
    subject: String(parsed.subject || ''),
    bodyHtml: String(parsed.bodyHtml || ''),
  }
}

export async function generateLeadEmailTemplate({ objective, tone = 'professional', customPrompt = '' }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new OpenAiServiceError({
      status: 503,
      code: 'missing_api_key',
      message: 'AI is not configured (missing OPENAI_API_KEY).',
    })
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const leadFields = [
    'first_name',
    'last_name',
    'contact_name',
    'company',
    'designation',
    'email',
    'phone',
    'value',
    'source',
    'status',
    'city',
    'state',
    'country',
    'sender_name',
  ]

  const prompt = `You are writing high-converting B2B sales email templates for CRM outreach.
Objective: ${objective || 'start a sales conversation'}.
Tone: ${tone}.
User instructions: ${customPrompt || 'none'}.

Available merge tags (must be used with double curly braces):
${leadFields.map((f) => `{{${f}}}`).join(', ')}.

Rules:
- Return ONLY strict JSON with keys: subject, bodyHtml, suggestedTags.
- subject max 120 chars.
- bodyHtml should be clean HTML email body with paragraphs and bullet points where useful.
- Personalize with merge tags and keep placeholders realistic.
- Do not add markdown fences.
`

  const data = await callOpenAi(apiKey, {
    model,
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  })
  const content = data?.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)
  return {
    subject: String(parsed.subject || ''),
    bodyHtml: String(parsed.bodyHtml || ''),
    suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags.map((x) => String(x)) : [],
    leadFields,
  }
}
