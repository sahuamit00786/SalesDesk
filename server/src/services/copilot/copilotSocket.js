import { verifyAccessToken } from '../tokenService.js'
import { ChatSession } from '../../models/index.js'

let ioInstance = null

function roomName(sessionId) {
  return `copilot:${sessionId}`
}

/** Attaches auth + room-join handling to an existing Socket.IO server instance. */
export function registerCopilotSocket(io) {
  ioInstance = io

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Unauthorized'))
      const decoded = verifyAccessToken(token)
      socket.user = {
        id: String(decoded.sub),
        companyId: decoded.companyId ?? null,
        isCompanyAdmin: Boolean(decoded.isCompanyAdmin),
        userRoleKind: decoded.userRoleKind ?? null,
      }
      return next()
    } catch {
      return next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('copilot:join', async (sessionId) => {
      try {
        if (typeof sessionId !== 'string' || !sessionId) {
          return socket.emit('copilot:error', { message: 'Invalid session id' })
        }
        // Re-verify session ownership server-side — never trust the client-supplied
        // sessionId alone, this is a tenant/ownership boundary.
        const session = await ChatSession.findOne({
          where: { id: sessionId, userId: socket.user.id, companyId: socket.user.companyId },
        })
        if (!session) {
          return socket.emit('copilot:error', { message: 'Session not found or access denied' })
        }
        socket.join(roomName(sessionId))
        socket.emit('copilot:joined', { sessionId })
      } catch {
        socket.emit('copilot:error', { message: 'Failed to join session' })
      }
    })

    socket.on('copilot:leave', (sessionId) => {
      if (typeof sessionId === 'string') socket.leave(roomName(sessionId))
    })
  })
}

export function emitToken(sessionId, token) {
  ioInstance?.to(roomName(sessionId)).emit('copilot:token', { token })
}

export function emitBlock(sessionId, block) {
  ioInstance?.to(roomName(sessionId)).emit('copilot:block', block)
}

export function emitTitle(sessionId, title) {
  ioInstance?.to(roomName(sessionId)).emit('copilot:title', { sessionId, title })
}

export function emitDone(sessionId, payload) {
  ioInstance?.to(roomName(sessionId)).emit('copilot:done', payload)
}

export function emitError(sessionId, message) {
  ioInstance?.to(roomName(sessionId)).emit('copilot:error', { message })
}
