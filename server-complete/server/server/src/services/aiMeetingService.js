import { getOpenAI } from './openAiClient.js'
import { MeetingTranscript } from '../models/MeetingTranscript.js'
import { AiMeetingSummary } from '../models/AiMeetingSummary.js'

async function getTranscript(meetingId) {
  const rows = await MeetingTranscript.findAll({ where: { meetingId } })
  return rows.map((x) => x.utterance).join('\n')
}

export async function generateSummary(meetingId) {
  const transcript = await getTranscript(meetingId)
  if (!transcript) throw Object.assign(new Error('No transcript found for this meeting'), { status: 404 })

  const result = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Create a sales meeting summary covering key points, objections, and next steps.' },
      { role: 'user', content: transcript },
    ],
  })

  const summary = result.choices[0].message.content
  await AiMeetingSummary.upsert({ meetingId, summary })
  return { summary }
}

export async function extractActions(meetingId) {
  const transcript = await getTranscript(meetingId)
  if (!transcript) throw Object.assign(new Error('No transcript found for this meeting'), { status: 404 })

  const result = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Extract action items from the meeting transcript. Return JSON: { "actions": [{ "owner": string, "task": string, "dueDate": string|null }] }',
      },
      { role: 'user', content: transcript },
    ],
  })

  let actions
  try {
    actions = JSON.parse(result.choices[0].message.content).actions ?? []
  } catch {
    actions = []
  }
  return { actions }
}

export async function analyzeSentiment(meetingId) {
  const transcript = await getTranscript(meetingId)
  if (!transcript) throw Object.assign(new Error('No transcript found for this meeting'), { status: 404 })

  const result = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Analyze meeting sentiment. Return JSON: { "score": number (1-10), "label": "positive"|"neutral"|"negative", "notes": string }',
      },
      { role: 'user', content: transcript },
    ],
  })

  let sentiment
  try {
    sentiment = JSON.parse(result.choices[0].message.content)
  } catch {
    sentiment = { score: 5, label: 'neutral', notes: result.choices[0].message.content }
  }
  return { sentiment }
}
