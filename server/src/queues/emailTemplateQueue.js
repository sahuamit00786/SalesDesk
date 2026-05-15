import { Queue, Worker } from 'bullmq'
import { getMailTransport } from '../services/mailService.js'
import { sequelize, EmailSuppression, EmailTemplate, Lead, LeadEmailLog, User } from '../models/index.js'
import {
  injectTrackingPixel,
  injectUnsubscribeLink,
  resolveMergeTags,
  wrapLinksWithTracking,
} from '../services/emailTemplateService.js'

const QUEUE_NAME = 'email-template-send'
let queue = null
let worker = null

import { bullmqConnectionFromEnv } from './connection.js'

function apiBaseUrl() {
  return process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`
}

async function pauseForThrottle(template) {
  const throttlePerHour = Number(template.throttlePerHour || 0)
  if (!throttlePerHour || throttlePerHour <= 0) return
  const delayMs = Math.ceil(3600000 / throttlePerHour)
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

async function sendToLead({ template, lead, senderName }) {
  const t = await sequelize.transaction()
  try {
    const suppressed = await EmailSuppression.findOne({
      where: {
        companyId: template.companyId,
        email: lead.email || '',
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    })
    if (suppressed) {
      await t.commit()
      return { skipped: true, reason: 'unsubscribed' }
    }

    const existing = await LeadEmailLog.findOne({
      where: {
        leadId: lead.id,
        templateId: template.id,
        templateVersion: template.version,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    })
    if (template.skipIfAlreadySent && existing) {
      await t.commit()
      return { skipped: true, reason: 'already_sent' }
    }

    const { subject, bodyHtml } = resolveMergeTags(template.subject, template.bodyHtml, lead, {
      senderName,
    })
    const log = existing
      ? await existing.update(
          { subject, bodyHtml, toEmail: lead.email || null, status: 'drafted' },
          { transaction: t },
        )
      : await LeadEmailLog.create(
          {
            companyId: template.companyId,
            workspaceId: template.workspaceId,
            leadId: lead.id,
            templateId: template.id,
            templateVersion: template.version,
            subject,
            bodyHtml,
            toEmail: lead.email || null,
            status: 'drafted',
          },
          { transaction: t },
        )
    await t.commit()

    const base = apiBaseUrl()
    let finalBody = wrapLinksWithTracking(bodyHtml, `${base}/track/click`, log.id)
    finalBody = injectTrackingPixel(finalBody, `${base}/track/open?log_id=${encodeURIComponent(log.id)}`)
    if (template.autoUnsubscribeLink) {
      finalBody = injectUnsubscribeLink(finalBody, `${base}/unsubscribe?log_id=${encodeURIComponent(log.id)}`)
    }

    const transport = getMailTransport()
    if (!transport) {
      throw new Error('SMTP is not configured')
    }
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: lead.email,
      subject,
      html: finalBody,
      attachments: Array.isArray(template.attachments) ? template.attachments : [],
    })

    await LeadEmailLog.update(
      {
        status: 'sent',
        sentAt: new Date(),
        bounced: false,
        sendError: null,
      },
      { where: { id: log.id } },
    )
    return { sent: true, logId: log.id }
  } catch (error) {
    await t.rollback().catch(() => {})
    await LeadEmailLog.upsert({
      companyId: template.companyId,
      workspaceId: template.workspaceId,
      leadId: lead.id,
      templateId: template.id,
      templateVersion: template.version,
      status: 'bounced',
      bounced: true,
      sendError: error.message || 'Email delivery failed',
    })
    return { sent: false, error: error.message || 'Email delivery failed' }
  }
}

async function processTemplateJob(job) {
  const { templateId, leadIds, companyId } = job.data
  const template = await EmailTemplate.findOne({
    where: { id: templateId, companyId, isArchived: false },
  })
  if (!template) return { ok: false, reason: 'template_not_found' }

  const sender = await User.findByPk(template.createdBy)
  const senderName = sender?.name || ''
  const leads = await Lead.findAll({
    where: { id: leadIds, companyId },
  })

  const result = {
    sent: [],
    skippedAlreadySent: [],
    skippedUnsubscribed: [],
    failed: [],
  }
  for (const lead of leads) {
    if (!lead.email) {
      result.failed.push({ leadId: lead.id, reason: 'missing_email' })
      continue
    }
    const sendResult = await sendToLead({ template, lead, senderName })
    if (sendResult?.skipped && sendResult.reason === 'already_sent') result.skippedAlreadySent.push(lead.id)
    else if (sendResult?.skipped && sendResult.reason === 'unsubscribed') result.skippedUnsubscribed.push(lead.id)
    else if (sendResult?.sent) result.sent.push(lead.id)
    else result.failed.push({ leadId: lead.id, reason: sendResult?.error || 'send_failed' })

    await pauseForThrottle(template)
  }

  return result
}

/** Same as BullMQ worker handler — used for inline sends (e.g. workflows) when queue is unavailable. */
export async function runTemplateSendJobInline(jobData) {
  return processTemplateJob({ data: jobData })
}

export function getEmailTemplateQueue() {
  if (queue) return queue
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  queue = new Queue(QUEUE_NAME, { connection })
  return queue
}

export async function enqueueTemplateSendJob(payload) {
  const q = getEmailTemplateQueue()
  if (!q) throw new Error('Queue unavailable: REDIS_URL is not configured')
  const delay = payload.scheduleAt ? Math.max(new Date(payload.scheduleAt).getTime() - Date.now(), 0) : 0
  const job = await q.add('send-template-batch', payload, {
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 200,
    delay,
  })
  return job
}

export function startEmailTemplateWorker() {
  if (worker) return worker
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  worker = new Worker(QUEUE_NAME, processTemplateJob, { connection, concurrency: 1 })
  worker.on('error', () => {})
  return worker
}
