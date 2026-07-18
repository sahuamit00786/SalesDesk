import { ChatSession, ChatMessage } from '../models/index.js'
import { createSession, runCopilotTurn, resolveDisambiguationSelection } from '../services/copilot/copilotOrchestrator.js'

function scopeFilter(req) {
  return { companyId: req.user.companyId, workspaceId: req.workspaceId, userId: req.user.id }
}

export async function createSessionHandler(req, res, next) {
  try {
    const session = await createSession({ req })
    return res.status(201).json({ success: true, data: { id: session.id, title: session.title } })
  } catch (err) {
    return next(err)
  }
}

export async function listSessions(req, res, next) {
  try {
    const sessions = await ChatSession.findAll({
      where: scopeFilter(req),
      order: [['lastMessageAt', 'DESC'], ['createdAt', 'DESC']],
      limit: 50,
    })
    return res.json({ success: true, data: sessions })
  } catch (err) {
    return next(err)
  }
}

export async function getSessionMessages(req, res, next) {
  try {
    const session = await ChatSession.findOne({ where: { id: req.params.id, ...scopeFilter(req) } })
    if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } })

    const messages = await ChatMessage.findAll({
      where: { sessionId: session.id, role: ['user', 'assistant'] },
      order: [['createdAt', 'ASC']],
      limit: 200,
    })
    return res.json({ success: true, data: messages })
  } catch (err) {
    return next(err)
  }
}

export async function sendMessage(req, res, next) {
  try {
    const session = await ChatSession.findOne({ where: { id: req.params.id, ...scopeFilter(req) } })
    if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } })

    const { text, selection } = req.body || {}

    res.status(202).json({ success: true, data: { accepted: true } })

    if (selection && selection.selectedId) {
      resolveDisambiguationSelection({
        session,
        entityType: selection.entityType || 'user',
        nameQuery: selection.nameQuery,
        selectedId: selection.selectedId,
        selectedLabel: selection.selectedLabel,
        req,
      }).catch(() => {})
      return
    }

    if (typeof text === 'string' && text.trim()) {
      runCopilotTurn({ session, userMessageText: text.trim(), req }).catch(() => {})
    }
  } catch (err) {
    return next(err)
  }
}

export async function deleteSession(req, res, next) {
  try {
    const session = await ChatSession.findOne({ where: { id: req.params.id, ...scopeFilter(req) } })
    if (!session) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } })
    await ChatMessage.destroy({ where: { sessionId: session.id } })
    await session.destroy()
    return res.json({ success: true })
  } catch (err) {
    return next(err)
  }
}
