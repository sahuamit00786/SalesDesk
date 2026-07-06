import { Notification } from '../models/index.js'
import { getMailTransport, appDisplayName } from './mailService.js'

export async function createNotification({ userId, companyId, workspaceId, title, message, type = 'info', link = null }) {
  return Notification.create({
    userId,
    companyId,
    workspaceId,
    title,
    message,
    type,
    link,
    isRead: false,
  })
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
