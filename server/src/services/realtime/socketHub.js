import { verifyAccessToken } from '../tokenService.js'

/**
 * Realtime hub — targeted, per-user delivery over the EXISTING Socket.IO server.
 *
 * Design rules (why it's built this way):
 *  - Auth happens once, on the handshake, with the same access token the REST
 *    API uses (`socket.handshake.auth.token`). No token → no connection.
 *  - Every authenticated socket auto-joins exactly one private room:
 *        user:{userId}
 *    Nothing is ever broadcast company-wide. A notification reaches a user's
 *    devices ONLY via their own room, so "notification goes to the correct
 *    person" is enforced structurally — there is no code path that could leak
 *    one user's notification to another.
 *  - The hub is registered on the SAME `io` instance as copilot; it does not
 *    replace or interfere with `registerCopilotSocket`. Both `io.use` auth
 *    middlewares run; both accept the same token, so behavior is unchanged
 *    for copilot clients.
 *  - Access tokens expire (~15m) but sockets are long-lived. That is fine:
 *    the token is only used to prove identity AT CONNECT TIME. When a client
 *    reconnects (network blip, app foreground), it must present a currently
 *    valid token again. Clients should reconnect with a fresh token after a
 *    session refresh (the mobile client in this package does).
 */

let ioRef = null

function userRoom(userId) {
  return `user:${userId}`
}

export function registerRealtimeHub(io) {
  ioRef = io

  io.use((socket, next) => {
    // A socket may already be authed by another namespace middleware (copilot).
    if (socket.user?.id) return next()
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
    if (!socket.user?.id) return
    // The ONLY room a client is ever placed in by the hub: their own.
    socket.join(userRoom(socket.user.id))

    // Lightweight liveness check clients can use after reconnect.
    socket.on('realtime:ping', (cb) => {
      if (typeof cb === 'function') cb({ ok: true, at: Date.now() })
    })
  })
}

/**
 * Emit an event to ONE user (all of their connected devices/tabs).
 * Safe to call before the hub is registered or when the user is offline —
 * it becomes a no-op; persistence is the DB Notification row, realtime is
 * purely an accelerator on top of it.
 */
export function emitToUser(userId, event, payload) {
  if (!ioRef || !userId) return false
  ioRef.to(userRoom(String(userId))).emit(event, payload)
  return true
}

/** Emit the same event to several users, each via their private room. */
export function emitToUsers(userIds, event, payload) {
  if (!ioRef || !Array.isArray(userIds)) return 0
  let sent = 0
  for (const id of new Set(userIds.filter(Boolean).map(String))) {
    ioRef.to(userRoom(id)).emit(event, payload)
    sent += 1
  }
  return sent
}
