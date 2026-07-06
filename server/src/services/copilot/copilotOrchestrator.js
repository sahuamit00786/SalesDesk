import OpenAI from 'openai'
import { Op } from 'sequelize'
import { ChatSession, ChatMessage } from '../../models/index.js'
import { COPILOT_SYSTEM_PROMPT, COPILOT_TOOLS } from './copilotToolSchemas.js'
import { COPILOT_TOOL_IMPLEMENTATIONS } from './copilotTools.js'
import { emitToken, emitBlock, emitDone, emitError, emitTitle } from './copilotSocket.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const MAX_TOOL_ROUNDTRIPS = 4
const HISTORY_MESSAGE_LIMIT = 20
const MAX_OUTPUT_TOKENS = 800
// Caps runaway per-session cost/DB growth — a long-running thread nudges the
// user to start a fresh chat rather than accumulating unbounded OpenAI calls.
const MAX_MESSAGES_PER_SESSION = 60

function buildCtx(req) {
  const user = req.user
  const kind = user.userRoleKind
  const isSales = !user.isCompanyAdmin && kind !== 'workspace_admin' && kind !== 'manager'
  return {
    companyId: user.companyId,
    workspaceId: req.workspaceId,
    userId: user.id,
    isSales,
    rawUser: user,
  }
}

// Only replay user/assistant turns across API calls — 'tool' rows are only
// ever valid immediately after the specific assistant tool_calls message
// that requested them within the SAME OpenAI request. That assistant
// tool_calls message is never persisted (it's a mid-turn intermediate step,
// not user-facing), so replaying a persisted 'tool' row on a *later* turn
// has no preceding tool_calls message and OpenAI rejects the whole request
// with a 400. The final synthesized assistant text already captures the
// outcome of any tool calls, so dropping the raw tool exchange from history
// loses nothing the model needs going forward.
async function loadHistoryMessages(sessionId) {
  const rows = await ChatMessage.findAll({
    where: { sessionId, status: 'complete', role: { [Op.in]: ['user', 'assistant'] } },
    order: [['createdAt', 'ASC']],
    limit: HISTORY_MESSAGE_LIMIT,
  })
  return rows.map(rowToOpenAiMessage).filter(Boolean)
}

function rowToOpenAiMessage(row) {
  if (!row.content) return null
  return { role: row.role, content: row.content }
}

const MAX_ENTITY_LINKS = 8

/** Best-effort extraction of clickable record references from a tool's result, so the frontend can render "open this lead/user/deal/campaign" links. */
function extractEntityLinks(toolName, resultPayload) {
  const out = []
  try {
    if (toolName === 'getLeadDetail' && resultPayload?.data?.id) {
      const d = resultPayload.data
      out.push({ kind: 'lead', id: d.id, label: d.contactName || d.title || 'Lead' })
    }
    if (toolName === 'resolveAmbiguousEntity' && resultPayload?.matchCount === 1 && resultPayload.candidates?.[0]) {
      const c = resultPayload.candidates[0]
      out.push({ kind: c.kind, id: c.id, label: c.name })
    }
    if (toolName === 'getLeads' && Array.isArray(resultPayload?.data)) {
      for (const l of resultPayload.data.slice(0, MAX_ENTITY_LINKS)) {
        out.push({ kind: 'lead', id: l.id, label: l.contactName || l.title || 'Lead' })
      }
    }
    if (toolName === 'getDeals' && Array.isArray(resultPayload?.data)) {
      for (const d of resultPayload.data.slice(0, MAX_ENTITY_LINKS)) {
        out.push({ kind: 'deal', id: d.id, label: d.dealName || d.fullName || 'Deal' })
      }
    }
    if (toolName === 'getCampaignPerformance' && Array.isArray(resultPayload?.data?.tables?.campaigns)) {
      for (const c of resultPayload.data.tables.campaigns.slice(0, MAX_ENTITY_LINKS)) {
        out.push({ kind: 'campaign', id: c.id, label: c.name })
      }
    }
    if (toolName === 'getUserPerformance' && Array.isArray(resultPayload?.data?.tables?.team)) {
      for (const u of resultPayload.data.tables.team.slice(0, MAX_ENTITY_LINKS)) {
        if (u.id && u.name) out.push({ kind: 'user', id: u.id, label: u.name })
      }
    }
  } catch {
    // best-effort — never let link extraction break the actual answer
  }
  return out
}

function dedupeEntityLinks(list) {
  const seen = new Map()
  for (const e of list) {
    if (!e?.id || !e?.kind) continue
    seen.set(`${e.kind}:${e.id}`, e)
  }
  return [...seen.values()].slice(0, MAX_ENTITY_LINKS)
}

function resolvedEntitiesSummary(session) {
  const entities = session.resolvedEntities
  if (!entities || Object.keys(entities).length === 0) return null
  return `Resolved entities already picked by the user this conversation (do not re-ask disambiguation for these): ${JSON.stringify(entities)}`
}

/**
 * Runs one conversation turn: streams text tokens + structured blocks to the
 * session's Socket.IO room, persists the full turn, and resolves when done.
 */
export async function runCopilotTurn({ session, userMessageText, systemAside, req }) {
  const ctx = buildCtx(req)
  const sessionId = session.id

  await ChatMessage.create({
    sessionId,
    companyId: ctx.companyId,
    workspaceId: ctx.workspaceId,
    role: 'user',
    content: userMessageText,
  })

  // Name the chat from the user's first real question (skip disambiguation
  // resumes, whose text is just "Selected: …" plumbing).
  if (!session.title && !systemAside && userMessageText) {
    session.title = deriveSessionTitle(userMessageText)
    await session.save()
    // Push the freshly-derived title to the client immediately so the sidebar
    // renames the chat the moment the first message is sent.
    emitTitle(sessionId, session.title)
  }

  const messageCount = await ChatMessage.count({ where: { sessionId } })
  if (messageCount > MAX_MESSAGES_PER_SESSION) {
    const limitText = "This conversation has reached its message limit. Please start a new chat to keep asking questions — it keeps things fast and keeps your history easy to search."
    await ChatMessage.create({
      sessionId,
      companyId: ctx.companyId,
      workspaceId: ctx.workspaceId,
      role: 'assistant',
      content: limitText,
      blocks: [{ type: 'text', markdown: limitText }],
    })
    emitToken(sessionId, limitText)
    emitDone(sessionId, { pendingDisambiguation: false })
    await touchSession(session)
    return
  }

  const history = await loadHistoryMessages(sessionId)
  const entitySummary = resolvedEntitiesSummary(session)

  const messages = [
    { role: 'system', content: COPILOT_SYSTEM_PROMPT },
    ...(entitySummary ? [{ role: 'system', content: entitySummary }] : []),
    ...history,
    // Turn-scoped only — not persisted, so it won't leak into later turns
    // once resolvedEntitiesSummary already carries the resolution forward.
    ...(systemAside ? [{ role: 'system', content: systemAside }] : []),
  ]

  try {
    let finalText = ''
    let roundtrips = 0
    let pendingDisambiguation = null
    let touchedEntities = []

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { textDelta, toolCalls } = await streamOneCompletion(sessionId, messages)
      finalText += textDelta

      if (!toolCalls.length) {
        break
      }

      messages.push({
        role: 'assistant',
        content: textDelta || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.argsText },
        })),
      })

      let disambiguationHit = false
      for (const call of toolCalls) {
        const impl = COPILOT_TOOL_IMPLEMENTATIONS[call.name]
        let resultPayload
        let args = {}
        try {
          args = call.argsText ? JSON.parse(call.argsText) : {}
        } catch {
          args = {}
        }
        if (!impl) {
          resultPayload = { error: `Unknown tool ${call.name}` }
        } else {
          try {
            resultPayload = await impl(args, ctx)
          } catch (err) {
            resultPayload = { error: err.message }
          }
        }

        await ChatMessage.create({
          sessionId,
          companyId: ctx.companyId,
          workspaceId: ctx.workspaceId,
          role: 'tool',
          toolName: call.name,
          toolArgs: safeParse(call.argsText),
          toolCallId: call.id,
          content: JSON.stringify(resultPayload).slice(0, 20000),
        })

        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(resultPayload).slice(0, 20000) })

        touchedEntities.push(...extractEntityLinks(call.name, resultPayload))

        if (call.name === 'resolveAmbiguousEntity' && resultPayload?.matchCount > 1) {
          disambiguationHit = true
          pendingDisambiguation = {
            nameQuery: args?.nameQuery,
            candidates: resultPayload.candidates,
          }
        }
      }

      roundtrips += 1
      if (disambiguationHit || roundtrips >= MAX_TOOL_ROUNDTRIPS) break
    }

    if (pendingDisambiguation) {
      const block = {
        type: 'disambiguation',
        prompt: `I found multiple matches for "${pendingDisambiguation.nameQuery}". Which one did you mean?`,
        nameQuery: pendingDisambiguation.nameQuery,
        options: pendingDisambiguation.candidates.map((c) => ({
          id: c.id,
          entityType: c.kind,
          label: `${c.name} — ${c.subtitle}`,
          meta: c.meta,
        })),
      }
      emitBlock(sessionId, block)
      await ChatMessage.create({
        sessionId,
        companyId: ctx.companyId,
        workspaceId: ctx.workspaceId,
        role: 'assistant',
        blocks: [block],
        status: 'pending_disambiguation',
      })
      emitDone(sessionId, { pendingDisambiguation: true })
      await touchSession(session)
      return
    }

    const dedupedEntities = dedupeEntityLinks(touchedEntities)
    const blocks = [
      { type: 'text', markdown: finalText },
      ...(dedupedEntities.length ? [{ type: 'entities', items: dedupedEntities }] : []),
    ]
    if (dedupedEntities.length) emitBlock(sessionId, blocks[1])
    await ChatMessage.create({
      sessionId,
      companyId: ctx.companyId,
      workspaceId: ctx.workspaceId,
      role: 'assistant',
      content: finalText,
      blocks,
    })
    emitDone(sessionId, { pendingDisambiguation: false })
    await touchSession(session)
  } catch (err) {
    emitError(sessionId, err.message || 'Copilot request failed')
  }
}

/** Resumes a turn after the user clicks a disambiguation option. */
export async function resolveDisambiguationSelection({ session, entityType, nameQuery, selectedId, selectedLabel, req }) {
  const resolved = { ...(session.resolvedEntities || {}) }
  resolved[entityType] = resolved[entityType] || {}
  resolved[entityType][nameQuery] = selectedId
  session.resolvedEntities = resolved
  await session.save()

  const displayText = `Selected: ${selectedLabel || nameQuery}`
  return runCopilotTurn({
    session,
    userMessageText: displayText,
    // The model needs the actual id/kind to call tools with — the short
    // display text alone isn't enough context, so append it as a system
    // aside rather than making the user-visible bubble carry raw plumbing.
    systemAside: `The user just resolved "${nameQuery}" to ${entityType} id ${selectedId}. Continue answering their previous question using this selection — call the appropriate detail tool (e.g. getLeadDetail for a lead, getUserPerformance for a user) rather than asking again.`,
    req,
  })
}

const TITLE_MAX_LEN = 60

/** Turns a user's first message into a short, clean chat title. */
function deriveSessionTitle(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= TITLE_MAX_LEN) return cleaned
  return `${cleaned.slice(0, TITLE_MAX_LEN).trimEnd()}…`
}

async function touchSession(session) {
  session.lastMessageAt = new Date()
  await session.save()
}

function safeParse(text) {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

/** Streams one OpenAI completion, forwarding text tokens live, accumulating tool-call args by index. */
async function streamOneCompletion(sessionId, messages) {
  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools: COPILOT_TOOLS,
    tool_choice: 'auto',
    stream: true,
    max_tokens: MAX_OUTPUT_TOKENS,
  })

  let textDelta = ''
  const toolCallsByIndex = new Map()

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta
    if (!delta) continue

    if (delta.content) {
      textDelta += delta.content
      emitToken(sessionId, delta.content)
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index
        if (!toolCallsByIndex.has(idx)) {
          toolCallsByIndex.set(idx, { id: tc.id, name: tc.function?.name, argsText: '' })
        }
        const entry = toolCallsByIndex.get(idx)
        if (tc.id) entry.id = tc.id
        if (tc.function?.name) entry.name = tc.function.name
        if (tc.function?.arguments) entry.argsText += tc.function.arguments
      }
    }
  }

  return { textDelta, toolCalls: [...toolCallsByIndex.values()] }
}

export async function createSession({ req }) {
  return ChatSession.create({
    companyId: req.user.companyId,
    workspaceId: req.workspaceId,
    userId: req.user.id,
  })
}
