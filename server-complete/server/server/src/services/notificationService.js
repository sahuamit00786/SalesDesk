import { Notification } from '../models/index.js'
import { getMailTransport, appDisplayName } from './mailService.js'
import { emitToUser } from './realtime/socketHub.js'

/**
 * DROP-IN REPLACEMENT for src/services/notificationService.js
 *
 * Same exports, same signatures, same DB behavior as before — plus, after the
 * Notification row is persisted, the SAME row is pushed over Socket.IO to the
 * recipient's private room only (`user:{userId}`), so:
 *   - the correct person (and only that person) receives it, on every device
 *   - the socket payload is exactly what GET /notifications returns for that
 *     row, so clients can prepend it to their cached list with zero mapping
 *   - if the socket layer is down or the user is offline, nothing is lost:
 *     the DB row remains the source of truth and polling still works.
 *
 * Every existing call site (leave approvals, notificationEmailQueue, etc.)
 * gains realtime delivery automatically — no other file needs to change to
 * emit notifications.
 */

export const REALTIME_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  BADGE_INVALIDATE: 'notification:badge', // client should refetch unread count
}

function serializeForClient(n) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    link: n.link,
    isRead: n.isRead,
    workspaceId: n.workspaceId,
    createdAt: n.createdAt,
  }
}

export async function createNotification({
  userId,
  companyId,
  workspaceId,
  title,
  message,
  type = 'info',
  link = null,
}) {
  const row = await Notification.create({
    userId,
    companyId,
    workspaceId,
    title,
    message,
    type,
    link,
    isRead: false,
  })

  // Realtime is best-effort by design: a socket failure must never fail the
  // business operation that produced the notification.
  try {
    emitToUser(userId, REALTIME_EVENTS.NOTIFICATION_NEW, serializeForClient(row))
    emitToUser(userId, REALTIME_EVENTS.BADGE_INVALIDATE, { at: Date.now() })
  } catch {
    /* no-op — polling remains the fallback */
  }

  return row
}

export async function notifyUserEmail(user, subject, html) {
  const transport = getMailTransport()
  if (!transport || !user?.email) return false
  const from = process.env.SMTP_FROM || `${appDisplayName()} <${process.env.SMTP_USER}>`
  await transport.sendMail({
    from,
    to: user.email,
    subject,
    html,
  })
  return true
}
