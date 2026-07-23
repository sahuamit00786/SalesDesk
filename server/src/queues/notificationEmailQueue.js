import { Queue, Worker } from 'bullmq'
import { bullmqConnectionFromEnv } from './connection.js'
import { getMailTransport, appDisplayName } from '../services/mailService.js'
import { createNotification } from '../services/notificationService.js'
import {
  getCompanyNotificationSettings,
  getEventChannels,
  NOTIFICATION_EVENT_TYPES,
} from '../services/notification/notificationPreferencesService.js'
import {
  buildHtmlForEvent,
  subjectForEvent,
} from '../services/notification/notificationEmailTemplates.js'
import { NotificationDeliveryLog, User, Workspace, Company } from '../models/index.js'
import { primaryClientOrigin } from '../config/corsOrigins.js'

const QUEUE_NAME = 'team-notification-email'
let queue = null
let worker = null

function clientOrigin() {
  return primaryClientOrigin
}

async function loadContext(jobData) {
  const [recipient, actor, workspace, company] = await Promise.all([
    User.findByPk(jobData.recipientUserId, { attributes: ['id', 'name', 'email', 'companyId'] }),
    jobData.actorUserId ? User.findByPk(jobData.actorUserId, { attributes: ['id', 'name', 'email'] }) : null,
    jobData.workspaceId ? Workspace.findByPk(jobData.workspaceId, { attributes: ['id', 'name'] }) : null,
    Company.findByPk(jobData.companyId, { attributes: ['id', 'name'] }),
  ])
  return { recipient, actor, workspace, company }
}

function buildViewUrl(eventType, payload) {
  const base = clientOrigin()
  switch (eventType) {
    case NOTIFICATION_EVENT_TYPES.LEAD_ASSIGNED:
      return `${base}/leads`
    case NOTIFICATION_EVENT_TYPES.CAMPAIGN_LEADS_ADDED:
      return payload.campaignId ? `${base}/campaigns/${payload.campaignId}` : `${base}/campaigns`
    case NOTIFICATION_EVENT_TYPES.TASK_ASSIGNED:
    case NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY:
      return `${base}/tasks`
    case NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE:
    case NOTIFICATION_EVENT_TYPES.LEAD_EMAIL_REPLY:
      return payload.leadId ? `${base}/leads/${payload.leadId}` : `${base}/leads`
    case NOTIFICATION_EVENT_TYPES.MEETING_REMINDER:
      return `${base}/meetings`
    case NOTIFICATION_EVENT_TYPES.LEAD_STATUS_CHANGED:
    case NOTIFICATION_EVENT_TYPES.LEAD_NOTE_ADDED:
      return payload.leadId ? `${base}/leads/${payload.leadId}` : `${base}/leads`
    case NOTIFICATION_EVENT_TYPES.OPPORTUNITY_STAGE_CHANGED:
      return payload.leadId ? `${base}/opportunities/${payload.leadId}` : `${base}/opportunities`
    case NOTIFICATION_EVENT_TYPES.DEAL_STAGE_CHANGED:
      return payload.dealId ? `${base}/deals/${payload.dealId}` : `${base}/deals`
    case NOTIFICATION_EVENT_TYPES.TASK_COMMENT_ADDED:
    case NOTIFICATION_EVENT_TYPES.TASK_DUE_REMINDER:
      return `${base}/tasks`
    case NOTIFICATION_EVENT_TYPES.INVOICE_CREATED:
    case NOTIFICATION_EVENT_TYPES.INVOICE_PAYMENT_RECEIVED:
      if (payload.invoiceId) return `${base}/invoices/${payload.invoiceId}`
      if (payload.dealId) return `${base}/deals/${payload.dealId}`
      return `${base}/invoices`
    case NOTIFICATION_EVENT_TYPES.DOCUMENT_SHARED:
      return `${base}/documents`
    case NOTIFICATION_EVENT_TYPES.SECURITY_PASSWORD_CHANGED:
    case NOTIFICATION_EVENT_TYPES.SECURITY_EMAIL_CHANGED:
      return `${base}/settings`
    case NOTIFICATION_EVENT_TYPES.CALL_REMINDER:
      return payload.leadId ? `${base}/leads/${payload.leadId}` : `${base}/calls`
    case NOTIFICATION_EVENT_TYPES.LEAVE_DECIDED:
      return `${base}/leave`
    default:
      return `${base}/dashboard`
  }
}

function inAppMessage(eventType, payload, actorName, workspaceName) {
  switch (eventType) {
    case NOTIFICATION_EVENT_TYPES.LEAD_ASSIGNED:
      return payload.leadCount === 1
        ? `${actorName} assigned 1 lead to you in ${workspaceName}`
        : `${actorName} assigned ${payload.leadCount} leads to you in ${workspaceName}`
    case NOTIFICATION_EVENT_TYPES.CAMPAIGN_LEADS_ADDED:
      return `${actorName} added ${payload.leadCount} lead(s) to campaign "${payload.campaignName}"`
    case NOTIFICATION_EVENT_TYPES.TASK_ASSIGNED:
      return `${actorName} assigned ${payload.taskCount} task(s) to you`
    case NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY:
      return payload.taskCount
        ? `${payload.taskCount} task(s) due today in ${workspaceName}`
        : `No tasks due today in ${workspaceName}`
    case NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE:
      return payload.escalation
        ? `${payload.overdueCount} follow-up${payload.overdueCount === 1 ? '' : 's'} on your team ${payload.overdueCount === 1 ? 'is' : 'are'} over 24h overdue`
        : `Follow-up with ${payload.leadName || 'a lead'} is due in 15 minutes`
    case NOTIFICATION_EVENT_TYPES.LEAD_EMAIL_REPLY:
      return `${payload.leadName || 'A lead'} replied to your email`
    case NOTIFICATION_EVENT_TYPES.MEETING_REMINDER:
      return `Your meeting "${payload.meetingTitle || 'Meeting'}" starts in 10 minutes`
    case NOTIFICATION_EVENT_TYPES.LEAD_STATUS_CHANGED:
      return payload.reassignedAwayTo
        ? `${payload.leadName || 'A lead'} was reassigned to ${payload.reassignedAwayTo}`
        : `${payload.leadName || 'A lead'} moved to "${payload.status}"`
    case NOTIFICATION_EVENT_TYPES.LEAD_NOTE_ADDED:
      return `${payload.actorName || actorName} added a note on ${payload.leadName || 'a lead'}`
    case NOTIFICATION_EVENT_TYPES.OPPORTUNITY_STAGE_CHANGED:
      return payload.created
        ? `New opportunity "${payload.opportunityName || 'Opportunity'}" created`
        : `"${payload.opportunityName || 'Opportunity'}" moved to ${payload.stage}`
    case NOTIFICATION_EVENT_TYPES.DEAL_STAGE_CHANGED:
      return payload.created
        ? `New deal "${payload.dealName || 'Deal'}" created`
        : `"${payload.dealName || 'Deal'}" moved to ${payload.stage}`
    case NOTIFICATION_EVENT_TYPES.TASK_COMMENT_ADDED:
      return `New comment on task "${payload.taskTitle || 'Task'}"`
    case NOTIFICATION_EVENT_TYPES.TASK_DUE_REMINDER:
      return payload.overdue
        ? `Task "${payload.taskTitle || 'Task'}" is overdue`
        : `Task "${payload.taskTitle || 'Task'}" is due soon`
    case NOTIFICATION_EVENT_TYPES.INVOICE_CREATED:
      return `Invoice ${payload.invoiceNumber || ''} created`
    case NOTIFICATION_EVENT_TYPES.INVOICE_PAYMENT_RECEIVED:
      return payload.invoiceNumber
        ? `Payment received on invoice ${payload.invoiceNumber}`
        : `Payment received on deal "${payload.dealName || 'Deal'}"`
    case NOTIFICATION_EVENT_TYPES.DOCUMENT_SHARED:
      return `${payload.actorName || actorName} shared "${payload.documentName || 'a document'}" with you`
    case NOTIFICATION_EVENT_TYPES.SECURITY_PASSWORD_CHANGED:
      return `Your password was changed. If this wasn't you, secure your account now.`
    case NOTIFICATION_EVENT_TYPES.SECURITY_EMAIL_CHANGED:
      return `Your account email was changed. If this wasn't you, contact support.`
    case NOTIFICATION_EVENT_TYPES.CALL_REMINDER:
      return 'You have a call scheduled in 15 minutes'
    case NOTIFICATION_EVENT_TYPES.LEAVE_DECIDED:
      return payload.status === 'approved'
        ? `Your leave from ${payload.fromDate} to ${payload.toDate} was approved.`
        : `Your leave was rejected${payload.reason ? `: ${payload.reason}` : '.'}`
    default:
      return payload.message || 'You have a new notification'
  }
}

function inAppTitle(eventType, payload) {
  switch (eventType) {
    case NOTIFICATION_EVENT_TYPES.LEAD_ASSIGNED:
      return payload.leadCount === 1 ? 'Lead assigned' : `${payload.leadCount} leads assigned`
    case NOTIFICATION_EVENT_TYPES.CAMPAIGN_LEADS_ADDED:
      return 'Campaign update'
    case NOTIFICATION_EVENT_TYPES.TASK_ASSIGNED:
      return payload.taskCount === 1 ? 'Task assigned' : `${payload.taskCount} tasks assigned`
    case NOTIFICATION_EVENT_TYPES.TASKS_DUE_TODAY:
      return 'Tasks due today'
    case NOTIFICATION_EVENT_TYPES.FOLLOWUP_DUE:
      return payload.escalation ? 'Overdue follow-ups on your team' : 'Follow-up reminder'
    case NOTIFICATION_EVENT_TYPES.LEAD_EMAIL_REPLY:
      return 'New email reply'
    case NOTIFICATION_EVENT_TYPES.MEETING_REMINDER:
      return 'Meeting starting soon'
    case NOTIFICATION_EVENT_TYPES.LEAD_STATUS_CHANGED:
      return payload.reassignedAwayTo ? 'Lead reassigned' : 'Lead status changed'
    case NOTIFICATION_EVENT_TYPES.LEAD_NOTE_ADDED:
      return 'New note'
    case NOTIFICATION_EVENT_TYPES.OPPORTUNITY_STAGE_CHANGED:
      return payload.created ? 'New opportunity' : 'Opportunity updated'
    case NOTIFICATION_EVENT_TYPES.DEAL_STAGE_CHANGED:
      return payload.created ? 'New deal' : 'Deal updated'
    case NOTIFICATION_EVENT_TYPES.TASK_COMMENT_ADDED:
      return 'New comment'
    case NOTIFICATION_EVENT_TYPES.TASK_DUE_REMINDER:
      return payload.overdue ? 'Task overdue' : 'Task due soon'
    case NOTIFICATION_EVENT_TYPES.INVOICE_CREATED:
      return 'Invoice created'
    case NOTIFICATION_EVENT_TYPES.INVOICE_PAYMENT_RECEIVED:
      return 'Payment received'
    case NOTIFICATION_EVENT_TYPES.DOCUMENT_SHARED:
      return 'Document shared'
    case NOTIFICATION_EVENT_TYPES.SECURITY_PASSWORD_CHANGED:
    case NOTIFICATION_EVENT_TYPES.SECURITY_EMAIL_CHANGED:
      return 'Security alert'
    case NOTIFICATION_EVENT_TYPES.CALL_REMINDER:
      return 'Call reminder'
    case NOTIFICATION_EVENT_TYPES.LEAVE_DECIDED:
      return payload.status === 'approved' ? 'Leave approved' : 'Leave rejected'
    default:
      return 'Notification'
  }
}

async function recordLog(patch) {
  return NotificationDeliveryLog.create(patch)
}

async function processNotificationJob(job) {
  const { eventType, companyId, workspaceId, recipientUserId, actorUserId, payload = {} } = job.data
  const settings = await getCompanyNotificationSettings(companyId)
  const channels = getEventChannels(settings, eventType)
  const { recipient, actor, workspace, company } = await loadContext(job.data)

  if (!recipient || String(recipient.companyId) !== String(companyId)) {
    return { ok: false, reason: 'invalid_recipient' }
  }

  const actorName = actor?.name || actor?.email || 'A teammate'
  const workspaceName = workspace?.name || 'your workspace'
  const companyName = company?.name || 'your company'
  const viewUrl = buildViewUrl(eventType, payload)
  const emailPayload = {
    recipientName: recipient.name || recipient.email,
    actorName,
    workspaceName,
    companyName,
    viewUrl,
    ...payload,
  }
  const subject = subjectForEvent(eventType, emailPayload)
  const link = viewUrl.replace(clientOrigin(), '') || '/dashboard'

  const results = { inApp: null, email: null }

  if (channels.inApp) {
    try {
      const notification = await createNotification({
        userId: recipientUserId,
        companyId,
        workspaceId,
        title: inAppTitle(eventType, payload),
        message: inAppMessage(eventType, payload, actorName, workspaceName),
        type: eventType,
        link,
      })
      await recordLog({
        companyId,
        workspaceId: workspaceId || null,
        recipientUserId,
        actorUserId: actorUserId || null,
        eventType,
        channel: 'in_app',
        status: 'sent',
        subject: inAppTitle(eventType, payload),
        recipientEmail: recipient.email,
        payload: emailPayload,
        jobId: job.id ? String(job.id) : null,
        sentAt: new Date(),
      })
      results.inApp = { id: notification.id }
    } catch (err) {
      await recordLog({
        companyId,
        workspaceId: workspaceId || null,
        recipientUserId,
        actorUserId: actorUserId || null,
        eventType,
        channel: 'in_app',
        status: 'failed',
        payload: emailPayload,
        errorMessage: err.message,
        jobId: job.id ? String(job.id) : null,
      })
      results.inApp = { error: err.message }
    }
  } else {
    await recordLog({
      companyId,
      workspaceId: workspaceId || null,
      recipientUserId,
      actorUserId: actorUserId || null,
      eventType,
      channel: 'in_app',
      status: 'skipped',
      payload: emailPayload,
      jobId: job.id ? String(job.id) : null,
    })
  }

  if (!channels.email) {
    await recordLog({
      companyId,
      workspaceId: workspaceId || null,
      recipientUserId,
      actorUserId: actorUserId || null,
      eventType,
      channel: 'email',
      status: 'skipped',
      subject,
      recipientEmail: recipient.email,
      payload: emailPayload,
      jobId: job.id ? String(job.id) : null,
    })
    return { ok: true, results }
  }

  if (!recipient.email) {
    await recordLog({
      companyId,
      workspaceId: workspaceId || null,
      recipientUserId,
      actorUserId: actorUserId || null,
      eventType,
      channel: 'email',
      status: 'failed',
      subject,
      errorMessage: 'Recipient has no email address',
      payload: emailPayload,
      jobId: job.id ? String(job.id) : null,
    })
    return { ok: false, reason: 'no_email' }
  }

  const transport = getMailTransport()
  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[${appDisplayName()} notification] SMTP not configured — would email ${recipient.email}: ${subject}`)
      await recordLog({
        companyId,
        workspaceId: workspaceId || null,
        recipientUserId,
        actorUserId: actorUserId || null,
        eventType,
        channel: 'email',
        status: 'skipped',
        subject,
        recipientEmail: recipient.email,
        payload: emailPayload,
        errorMessage: 'SMTP not configured',
        jobId: job.id ? String(job.id) : null,
      })
      return { ok: true, results, devSkipped: true }
    }
    await recordLog({
      companyId,
      workspaceId: workspaceId || null,
      recipientUserId,
      actorUserId: actorUserId || null,
      eventType,
      channel: 'email',
      status: 'failed',
      subject,
      recipientEmail: recipient.email,
      payload: emailPayload,
      errorMessage: 'SMTP not configured',
      jobId: job.id ? String(job.id) : null,
    })
    return { ok: false, reason: 'smtp_unavailable' }
  }

  const html = buildHtmlForEvent(eventType, emailPayload)
  const from = process.env.SMTP_FROM || `${appDisplayName()} <${process.env.SMTP_USER}>`

  try {
    await transport.sendMail({ from, to: recipient.email, subject, html })
    await recordLog({
      companyId,
      workspaceId: workspaceId || null,
      recipientUserId,
      actorUserId: actorUserId || null,
      eventType,
      channel: 'email',
      status: 'sent',
      subject,
      recipientEmail: recipient.email,
      payload: emailPayload,
      jobId: job.id ? String(job.id) : null,
      sentAt: new Date(),
    })
    results.email = { sent: true }
  } catch (err) {
    await recordLog({
      companyId,
      workspaceId: workspaceId || null,
      recipientUserId,
      actorUserId: actorUserId || null,
      eventType,
      channel: 'email',
      status: 'failed',
      subject,
      recipientEmail: recipient.email,
      payload: emailPayload,
      errorMessage: err.message,
      jobId: job.id ? String(job.id) : null,
    })
    results.email = { error: err.message }
    throw err
  }

  return { ok: true, results }
}

export async function runNotificationJobInline(jobData) {
  return processNotificationJob({ data: jobData, id: 'inline' })
}

export function getNotificationEmailQueue() {
  if (queue) return queue
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  queue = new Queue(QUEUE_NAME, { connection })
  return queue
}

/**
 * Enqueue a team notification (email + in-app per company settings).
 * Falls back to inline processing when Redis is unavailable.
 */
export async function enqueueTeamNotification({
  eventType,
  companyId,
  workspaceId,
  recipientUserId,
  actorUserId,
  payload,
  delayMs = 0,
}) {
  if (!recipientUserId || String(recipientUserId) === String(actorUserId || '')) {
    return { skipped: true, reason: 'self_action' }
  }

  const jobData = {
    eventType,
    companyId,
    workspaceId: workspaceId || null,
    recipientUserId,
    actorUserId: actorUserId || null,
    payload: payload || {},
  }

  const q = getNotificationEmailQueue()
  if (!q) {
    await runNotificationJobInline(jobData)
    return { inline: true }
  }

  const job = await q.add('send-team-notification', jobData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 400,
    delay: Math.max(0, Number(delayMs) || 0),
  })
  return { jobId: job.id }
}

export function startNotificationEmailWorker() {
  if (worker) return worker
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  worker = new Worker(QUEUE_NAME, processNotificationJob, { connection, concurrency: 3 })
  worker.on('error', () => {})
  return worker
}
