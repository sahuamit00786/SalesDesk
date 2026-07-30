import { Queue, Worker } from 'bullmq'
import { randomUUID } from 'node:crypto'
import { getMailTransport, fromAddress } from '../services/mailService.js'
import { sequelize, EmailSuppression, EmailTemplate, Lead, LeadEmailLog, User, Workspace } from '../models/index.js'
import {
  injectTrackingPixel,
  injectUnsubscribeLink,
  resolveMergeTags,
  wrapLinksWithTracking,
} from '../services/emailTemplateService.js'
import { signUnsubscribeToken } from '../controllers/emailTrackingController.js'

const QUEUE_NAME = 'email-template-send'
let queue = null
let worker = null

import { bullmqConnectionFromEnv } from './connection.js'

function apiBaseUrl() {
  return process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`
}

async function sendToLead({ template, lead, senderName, source = 'bulk' }) {
  const t = await sequelize.transaction()
  let log
  try {
    // Case-insensitive: "John.Smith@Corp.com" unsubscribing must also stop sends to
    // "john.smith@corp.com" (§3.6 of the bug audit).
    const suppressed = await EmailSuppression.findOne({
      where: {
        companyId: template.companyId,
        email: String(lead.email || '').trim().toLowerCase(),
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    })
    if (suppressed) {
      await t.commit()
      return { skipped: true, reason: 'unsubscribed' }
    }

    // §3.8 of the bug audit: "already sent" must mean a prior row with status 'sent',
    // not "any row exists" — and re-sending must never overwrite that row (this used to
    // find-or-create on (lead,template,version) and UPDATE the existing row on resend,
    // destroying sentAt/openCount/clickCount from the first send). Every send attempt
    // now always creates its own row, so history survives repeated/re-sends.
    if (template.skipIfAlreadySent) {
      const alreadySent = await LeadEmailLog.findOne({
        where: { leadId: lead.id, templateId: template.id, templateVersion: template.version, status: 'sent' },
        transaction: t,
      })
      if (alreadySent) {
        await t.commit()
        return { skipped: true, reason: 'already_sent' }
      }
    }

    const { subject, bodyHtml } = resolveMergeTags(template.subject, template.bodyHtml, lead, {
      senderName,
    })
    log = await LeadEmailLog.create(
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
        source,
      },
      { transaction: t },
    )
    await t.commit()

    const base = apiBaseUrl()
    let finalBody = wrapLinksWithTracking(bodyHtml, `${base}/track/click`, log.id)
    finalBody = injectTrackingPixel(finalBody, `${base}/track/open?log_id=${encodeURIComponent(log.id)}`)
    if (template.autoUnsubscribeLink) {
      const sig = signUnsubscribeToken(log.id)
      finalBody = injectUnsubscribeLink(
        finalBody,
        `${base}/unsubscribe?log_id=${encodeURIComponent(log.id)}&sig=${encodeURIComponent(sig)}`,
      )
    }

    const transport = getMailTransport()
    if (!transport) {
      throw new Error('SMTP is not configured')
    }
    await transport.sendMail({
      from: fromAddress(),
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
    const bounce = isRealBounce(error)
    const patch = { status: bounce ? 'bounced' : 'failed', bounced: bounce, sendError: error.message || 'Email delivery failed' }
    if (log?.id) {
      // The drafted row already exists (failure happened after commit, e.g. the actual
      // send) — update that same row rather than upserting a second one for this attempt.
      await LeadEmailLog.update(patch, { where: { id: log.id } })
    } else {
      // Failed before the row was ever created (e.g. the suppression/already-sent
      // lookup itself threw) — nothing to update, so record the attempt as a new row.
      await LeadEmailLog.create({
        companyId: template.companyId,
        workspaceId: template.workspaceId,
        leadId: lead.id,
        templateId: template.id,
        templateVersion: template.version,
        ...patch,
      })
    }
    return { sent: false, error: error.message || 'Email delivery failed' }
  }
}

/**
 * Only a genuine SMTP rejection of the recipient address is a bounce. An SMTP timeout,
 * a missing/misconfigured transport, a network blip, or a template render error is an
 * infra failure, not a bounce — stamping those as 'bounced' corrupted deliverability
 * reporting and risked feeding valid addresses into suppression (§3.4 of the bug audit).
 */
function isRealBounce(error) {
  // Permanent SMTP rejection codes (mailbox unknown, relay refused, etc).
  if (typeof error?.responseCode === 'number' && error.responseCode >= 500 && error.responseCode < 600) return true
  // Nodemailer's own bounce-shaped error codes.
  if (error?.code === 'EENVELOPE' || error?.code === 'EMESSAGE') return true
  return false
}

async function processTemplateJob(job) {
  const { templateId, leadIds, companyId, workspaceId, source = 'bulk' } = job.data
  const template = await EmailTemplate.findOne({
    where: { id: templateId, companyId, isArchived: false },
  })
  if (!template) return { ok: false, reason: 'template_not_found' }

  const workspace = await Workspace.findOne({ where: { id: workspaceId, companyId } })
  if (!workspace || workspace.archivedAt) return { ok: false, reason: 'workspace_archived' }

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
    const sendResult = await sendToLead({ template, lead, senderName, source })
    if (sendResult?.skipped && sendResult.reason === 'already_sent') result.skippedAlreadySent.push(lead.id)
    else if (sendResult?.skipped && sendResult.reason === 'unsubscribed') result.skippedUnsubscribed.push(lead.id)
    else if (sendResult?.sent) result.sent.push(lead.id)
    else result.failed.push({ leadId: lead.id, reason: sendResult?.error || 'send_failed' })
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

/**
 * One BullMQ job per lead (not one job for the whole batch):
 * - throttlePerHour is honored via each job's own `delay`, not an in-handler sleep — a
 *   throttled campaign no longer holds the worker's only concurrency slot for hours.
 * - attempts: 1 — a retry used to restart the *entire* batch from lead #1; per-lead jobs
 *   mean a transient failure only affects that one lead (sendToLead already records the
 *   outcome, so nothing is silently lost — it just isn't auto-retried).
 * Returns a batchId (not a single BullMQ job id) since the "batch" is now many jobs;
 * nothing reads this id back to poll a specific job, it's informational only.
 */
export async function enqueueTemplateSendJob(payload) {
  const q = getEmailTemplateQueue()
  if (!q) throw new Error('Queue unavailable: REDIS_URL is not configured')
  const { leadIds = [], scheduleAt, throttlePerHour, ...rest } = payload
  const baseDelay = scheduleAt ? Math.max(new Date(scheduleAt).getTime() - Date.now(), 0) : 0
  const perHour = Number(throttlePerHour || 0)
  const intervalMs = perHour > 0 ? Math.ceil(3600000 / perHour) : 0
  const batchId = randomUUID()

  if (!leadIds.length) return { batchId, count: 0 }

  await q.addBulk(
    leadIds.map((leadId, i) => ({
      name: 'send-template-batch',
      data: { ...rest, leadIds: [leadId], batchId },
      opts: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 200,
        delay: baseDelay + intervalMs * i,
      },
    })),
  )
  return { batchId, count: leadIds.length }
}

export function startEmailTemplateWorker() {
  if (worker) return worker
  const connection = bullmqConnectionFromEnv()
  if (!connection) return null
  worker = new Worker(QUEUE_NAME, processTemplateJob, { connection, concurrency: 1 })
  worker.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[email-template-queue] worker error:', err?.message || err)
  })
  return worker
}
